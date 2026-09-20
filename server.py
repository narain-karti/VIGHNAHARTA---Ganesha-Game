import os
import sys
import json
import mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse
from excel_db import append_score_record, CAMPUSES, EXCEL_FILE
import openpyxl

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8080))

class GameRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for live scores
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/campuses":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"campuses": CAMPUSES}).encode("utf-8"))
            return

        elif path == "/api/scores":
            scores_data = self.get_all_scores_data()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(scores_data).encode("utf-8"))
            return

        elif path == "/api/download-excel":
            if os.path.exists(EXCEL_FILE):
                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                self.send_header("Content-Disposition", f"attachment; filename=\"{EXCEL_FILE}\"")
                self.send_header("Content-Length", str(os.path.getsize(EXCEL_FILE)))
                self.end_headers()
                with open(EXCEL_FILE, "rb") as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, "Excel database file not found")
                return

        # Default static file serving
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/score":
            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len)
            try:
                data = json.loads(post_body.decode("utf-8"))
                name = data.get("name", "Unknown Devotee").strip()
                campus = data.get("campus", "NIAT - General").strip()
                score = int(data.get("score", 0))
                wave = int(data.get("wave", 1))
                cleared = int(data.get("cleared", 0))
                combo = int(data.get("combo", 1))
                student_id = data.get("studentId", "").strip()
                blessings = int(data.get("blessings", 0))

                session_id = append_score_record(
                    name=name,
                    campus=campus,
                    score=score,
                    wave=wave,
                    cleared=cleared,
                    combo=combo,
                    student_id=student_id,
                    blessings=blessings
                )

                scores_data = self.get_all_scores_data()

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                resp = {
                    "success": True,
                    "sessionId": session_id,
                    "message": "Score successfully recorded to Excel database!",
                    "data": scores_data
                }
                self.wfile.write(json.dumps(resp).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        elif path == "/api/tts":
            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len)
            try:
                data = json.loads(post_body.decode("utf-8"))
                text = data.get("text", "").strip()
                voice_id = data.get("voice_id", "ErXwobaYiN019PkySvjV")
                api_key = "sk_785d5f75a0e3ec89f4d5fcfc73b8823ae9dfeacacc9566e4"
                if not text:
                    self.send_error(400, "Missing text")
                    return
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                payload = json.dumps({
                    "text": text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
                }).encode("utf-8")
                import urllib.request
                req = urllib.request.Request(url, data=payload, headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                })
                with urllib.request.urlopen(req, timeout=15) as resp:
                    audio_data = resp.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "audio/mpeg")
                    self.send_header("Content-Length", str(len(audio_data)))
                    self.end_headers()
                    self.wfile.write(audio_data)
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        self.send_error(404, "Endpoint not found")

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
                    "timestamp": str(ws1.cell(row=r, column=2).value or ''),
                    "name": str(ws1.cell(row=r, column=3).value or ''),
                    "campus": str(ws1.cell(row=r, column=4).value or ''),
                    "studentId": str(ws1.cell(row=r, column=5).value or ''),
                    "score": int(ws1.cell(row=r, column=6).value or 0),
                    "wave": int(ws1.cell(row=r, column=7).value or 1),
                    "cleared": int(ws1.cell(row=r, column=8).value or 0),
                    "combo": str(ws1.cell(row=r, column=9).value or 'x1'),
                    "blessings": int(ws1.cell(row=r, column=10).value or 0),
                    "status": str(ws1.cell(row=r, column=11).value or '')
                })

            ws2 = wb["Campus Leaderboard"]
            campus_rankings = []
            for r in range(2, ws2.max_row + 1):
                c_rank = ws2.cell(row=r, column=1).value
                if not c_rank:
                    continue
                campus_rankings.append({
                    "rank": int(c_rank),
                    "campus": str(ws2.cell(row=r, column=2).value or ''),
                    "totalDevotees": int(ws2.cell(row=r, column=3).value or 0),
                    "totalScore": int(ws2.cell(row=r, column=4).value or 0),
                    "highestScore": int(ws2.cell(row=r, column=5).value or 0),
                    "topDevotee": str(ws2.cell(row=r, column=6).value or '')
                })

            return {"sessions": sessions, "campuses": campus_rankings}
        except Exception as e:
            print(f"Error reading excel database: {e}")
            return {"sessions": [], "campuses": [], "error": str(e)}

import sys

# Ensure UTF-8 output encoding for Windows command line
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

def run():
    server_address = ("0.0.0.0", PORT)
    httpd = ReusableThreadingHTTPServer(server_address, GameRequestHandler)
    print(f"[OK] Vighnaharta Multi-Threaded Server running on http://localhost:{PORT}")
    print(f"[DB] Excel Database File: {os.path.abspath(EXCEL_FILE)}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
