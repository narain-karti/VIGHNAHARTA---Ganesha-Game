"""Vighnaharta production game server.

Serves the static game (index.html / game.js / style.css / assets) plus a
small JSON API backed by the Excel scoreboard (excel_db.py).

Production notes:
  - Secrets come from the environment only. Copy .env.example to .env.
  - Only whitelisted static files are served; source files (.py/.env/.git)
    and the live Excel DB are never exposed over HTTP (except the explicit
    /api/download-excel endpoint).
  - Run:  python server.py [PORT]   (env PORT wins, default 8080)
"""
import json
import mimetypes
import os
import sys
import urllib.parse
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# --- Minimal .env loader (no third-party dependency) ---
def _load_dotenv(path=".env"):
    try:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
    except OSError:
        pass

_load_dotenv()

from excel_db import append_score_record, CAMPUSES, EXCEL_FILE  # noqa: E402
import openpyxl  # noqa: E402


def _get_port():
    for raw in (os.environ.get("PORT"), sys.argv[1] if len(sys.argv) > 1 else "8080"):
        if raw is None:
            continue
        try:
            port = int(raw)
            if 1 <= port <= 65535:
                return port
        except (TypeError, ValueError):
            continue
    return 8080


PORT = _get_port()
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
MAX_JSON_BYTES = 16 * 1024  # reject oversized POST bodies (DoS guard)

# Static files that may be served. Everything else -> 404.
ALLOWED_STATIC_EXTS = {
    ".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg",
    ".mp3", ".wav", ".ogg", ".ico", ".json", ".webmanifest", ".txt",
}
ALLOWED_STATIC_ROOTS = ("assets/",)


class GameRequestHandler(SimpleHTTPRequestHandler):
    server_version = "Vighnaharta/1.0"

    # -- response helpers -------------------------------------------------
    def end_headers(self):
        if self.path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Cache-Control", "no-store")
        # Basic hardening headers (CSP kept permissive for Google Fonts +
        # inline game code; tighten further if the frontend is bundled).
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "microphone=(), camera=(), geolocation=()")
        super().end_headers()

    def _send_json(self, status, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # single-line access log
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    # -- static file guard ------------------------------------------------
    def _is_allowed_static(self, url_path):
        """Only serve whitelisted public files; never .py/.env/.git/xlsx."""
        rel = urllib.parse.unquote(url_path.lstrip("/"))
        if not rel or rel.endswith("/"):
            return True  # directory -> index.html
        if ".." in rel.split("/") or rel.startswith("."):
            return False
        lowered = rel.lower()
        if lowered.endswith((".py", ".pyc", ".env", ".xlsx", ".sqlite3", ".db", ".log")):
            return False
        if "/.git/" in ("/" + lowered) or lowered.startswith(".git"):
            return False
        if lowered in ("index.html", "game.js", "style.css", "favicon.ico"):
            return True
        if lowered.startswith(ALLOWED_STATIC_ROOTS):
            _, ext = os.path.splitext(lowered)
            return ext in ALLOWED_STATIC_EXTS
        _, ext = os.path.splitext(lowered)
        return ext in ALLOWED_STATIC_EXTS and "/" not in rel

    # -- GET --------------------------------------------------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ("/api/health", "/health", "/healthz"):
            self._send_json(200, {"ok": True, "service": "vighnaharta"})
            return

        if path == "/api/campuses":
            self._send_json(200, {"campuses": CAMPUSES})
            return

        if path == "/api/scores":
            self._send_json(200, self.get_all_scores_data())
            return

        if path == "/api/download-excel":
            if os.path.exists(EXCEL_FILE):
                self.send_response(200)
                self.send_header(
                    "Content-Type",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                self.send_header(
                    "Content-Disposition",
                    f'attachment; filename="{os.path.basename(EXCEL_FILE)}"',
                )
                self.send_header("Content-Length", str(os.path.getsize(EXCEL_FILE)))
                self.end_headers()
                with open(EXCEL_FILE, "rb") as f:
                    self.wfile.write(f.read())
                return
            self._send_json(404, {"success": False, "error": "Score database is empty."})
            return

        if path.startswith("/api/"):
            self._send_json(404, {"success": False, "error": "Unknown API endpoint"})
            return

        if not self._is_allowed_static(path):
            self._send_json(404, {"success": False, "error": "Not found"})
            return

        # Cache static game assets briefly; HTML/JS/CSS revalidated.
        if path.startswith("/assets/"):
            # SimpleHTTPRequestHandler handles the body; pre-set cache via
            # end_headers is path-aware, so patch here with a wrapper:
            self._cache_control_override = "public, max-age=86400"
        else:
            self._cache_control_override = "no-cache"
        orig_end_headers = self.end_headers

        def patched_end_headers():
            try:
                self.send_header("Cache-Control", self._cache_control_override)
            except Exception:
                pass
            orig_end_headers()

        self.end_headers = patched_end_headers
        try:
            if path == "/":
                self.path = "/index.html"
            return super().do_GET()
        finally:
            self.end_headers = orig_end_headers

    # -- POST -------------------------------------------------------------
    def _read_json_body(self):
        try:
            content_len = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            content_len = 0
        if content_len <= 0 or content_len > MAX_JSON_BYTES:
            return None, "Body must be 1-%d bytes" % MAX_JSON_BYTES
        try:
            raw = self.rfile.read(content_len)
            return json.loads(raw.decode("utf-8")), None
        except Exception:
            return None, "Invalid JSON body"

    @staticmethod
    def _clamp_int(value, default, lo, hi):
        try:
            return max(lo, min(hi, int(value)))
        except (TypeError, ValueError):
            return default

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/score":
            data, err = self._read_json_body()
            if err:
                self._send_json(400, {"success": False, "error": err})
                return
            name = str(data.get("name", "")).strip()[:45]
            campus = str(data.get("campus", "")).strip()[:120]
            student_id = str(data.get("studentId", "")).strip()[:30]
            if not name:
                self._send_json(400, {"success": False, "error": "Devotee name is required"})
                return
            if not campus or not (campus in CAMPUSES or campus == "NIAT - General"):
                self._send_json(400, {"success": False, "error": "Unknown NIAT campus"})
                return
            score = self._clamp_int(data.get("score", 0), 0, 0, 10_000_000)
            wave = self._clamp_int(data.get("wave", 1), 1, 1, 999)
            cleared = self._clamp_int(data.get("cleared", 0), 0, 0, 100_000)
            combo = self._clamp_int(data.get("combo", 1), 1, 1, 999)
            blessings = self._clamp_int(data.get("blessings", 0), 0, 0, 99)
            try:
                session_id = append_score_record(
                    name=name, campus=campus, score=score, wave=wave,
                    cleared=cleared, combo=combo, student_id=student_id,
                    blessings=blessings,
                )
                self._send_json(200, {
                    "success": True,
                    "sessionId": session_id,
                    "message": "Score successfully recorded to Excel database!",
                    "data": self.get_all_scores_data(),
                })
            except Exception as e:  # never leak tracebacks to clients
                self.log_message("score write failed: %s", e)
                self._send_json(500, {"success": False, "error": "Could not record score"})
            return

        if path == "/api/tts":
            if not ELEVENLABS_API_KEY:
                self._send_json(503, {"success": False, "error": "Voice service is not configured"})
                return
            data, err = self._read_json_body()
            if err:
                self._send_json(400, {"success": False, "error": err})
                return
            text = str(data.get("text", "")).strip()[:500]
            voice_id = str(data.get("voice_id", "ErXwobaYiN019PkySvjV")).strip()[:64]
            if not text:
                self._send_json(400, {"success": False, "error": "Missing text"})
                return
            try:
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                payload = json.dumps({
                    "text": text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                }).encode("utf-8")
                req = urllib.request.Request(url, data=payload, headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                })
                with urllib.request.urlopen(req, timeout=15) as resp:
                    audio_data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio_data)))
                self.end_headers()
                self.wfile.write(audio_data)
            except Exception as e:
                self.log_message("tts proxy failed: %s", e)
                self._send_json(502, {"success": False, "error": "Voice service unavailable"})
            return

        self._send_json(404, {"success": False, "error": "Endpoint not found"})

    # -- scoreboard read --------------------------------------------------
    def get_all_scores_data(self):
        if not os.path.exists(EXCEL_FILE):
            return {"sessions": [], "campuses": []}
        try:
            wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
            ws1 = wb["Devotee Scores"]
            sessions = []
            for r in range(2, ws1.max_row + 1):
                s_id = ws1.cell(row=r, column=1).value
                if not s_id:
                    continue
                sessions.append({
                    "sessionId": s_id,
                    "timestamp": str(ws1.cell(row=r, column=2).value or ""),
                    "name": str(ws1.cell(row=r, column=3).value or ""),
                    "campus": str(ws1.cell(row=r, column=4).value or ""),
                    "studentId": str(ws1.cell(row=r, column=5).value or ""),
                    "score": int(ws1.cell(row=r, column=6).value or 0),
                    "wave": int(ws1.cell(row=r, column=7).value or 1),
                    "cleared": int(ws1.cell(row=r, column=8).value or 0),
                    "combo": str(ws1.cell(row=r, column=9).value or "x1"),
                    "blessings": int(ws1.cell(row=r, column=10).value or 0),
                    "status": str(ws1.cell(row=r, column=11).value or ""),
                })

            ws2 = wb["Campus Leaderboard"]
            campus_rankings = []
            for r in range(2, ws2.max_row + 1):
                c_rank = ws2.cell(row=r, column=1).value
                if not c_rank:
                    continue
                campus_rankings.append({
                    "rank": int(c_rank),
                    "campus": str(ws2.cell(row=r, column=2).value or ""),
                    "totalDevotees": int(ws2.cell(row=r, column=3).value or 0),
                    "totalScore": int(ws2.cell(row=r, column=4).value or 0),
                    "highestScore": int(ws2.cell(row=r, column=5).value or 0),
                    "topDevotee": str(ws2.cell(row=r, column=6).value or ""),
                })
            # Latest sessions first (cap payload for the scoreboard UI)
            sessions.reverse()
            return {"sessions": sessions[:200], "campuses": campus_rankings}
        except Exception as e:
            print(f"Error reading excel database: {e}")
            return {"sessions": [], "campuses": [], "error": "Scoreboard unavailable"}


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def run():
    # Quiet .pyc / child-process noise; ensure UTF-8 logs on Windows.
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    mimetypes.add_type("audio/mpeg", ".mp3")
    server_address = ("0.0.0.0", PORT)
    httpd = ReusableThreadingHTTPServer(server_address, GameRequestHandler)
    print(f"[OK] Vighnaharta server on http://localhost:{PORT}")
    print(f"[DB] Excel database: {os.path.abspath(EXCEL_FILE)}")
    if not ELEVENLABS_API_KEY:
        print("[TTS] ELEVENLABS_API_KEY not set — /api/tts will return 503")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    run()
