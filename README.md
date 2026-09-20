# 🕉️ VIGHNAHARTA — The Obstacle Breaker (विघ्नहर्ता)

> **Ganesh Chaturthi Game Design Contest Entry**  
> *A Traditional Indian Devotional Pixel-Art Arcade Game built with Pure HTML5 Canvas, Vanilla JavaScript, and Web Audio API.*

---

## 🌸 Story & Concept

In ancient sanctums during the sacred festival of **Ganesh Chaturthi**, dark abstract obstacles (*Vighnas*) arise to disrupt the sanctity of the sanctum. As the divine blessing of **Lord Ganesha (विघ्नहर्ता - The Remover of Obstacles)**, you defend the sacred central **Mandala** using the divine **Parashu** (golden battle axe) and holy seals.

Protect the 5 Sacred Diyas (temple oil lamps) burning around the inner sanctum. Cleanse incoming obstacles into fragrant marigold petals, gather festival offerings, and maintain the divine flame.

---

## ✨ Features

- 🪓 **8-Directional Dynamic Ganesha Sprites**: Lord Ganesha turns dynamically in 8 directions (Up, Up-Right, Right, Down-Right, Down, Down-Left, Left, Up-Left) aligning toward the player's sacred target.
- ⚡ **Golden Parashu Weapon & Sacred Seals**: Tapping an obstacle unleashes a spinning golden Parashu projectile with trailing sacred dust, culminating in a glowing Sanskrit mandala seal that dissolves impurities into marigold petals.
- 🪔 **5 Sacred Diya Sanctum Life System**: 5 animated brass oil lamps with flickering SVG flames; when an obstacle breaches the inner sanctum, a diya extinguishes with a dynamic puff of smoke and screen shake.
- 👹 **4 Distinct Vighnas (Obstacles)**:
  - *Shadow Wisp*: Swift, erratic floating dark spirits.
  - *Thorn Cluster*: Fast, sharp jagged brambles.
  - *Stone Block*: Slow, heavily armored ancient stone blocks that require multiple strikes.
  - *Dark Swarm*: Swarms that split into smaller remnants upon impact.
- 🌺 **4 Sacred Festival Offerings**:
  - *Modak (मोदक)*: Restores an extinguished diya and grants sacred points.
  - *Pink Lotus (कमल)*: Cleanses all nearby obstacles in a radial burst of divine light.
  - *Durva Grass (दूर्वा)*: Slows down all active obstacles with temporal tranquility.
  - *Temple Dhol (ढोल)*: Empowers the next strikes with double multiplier power.
- 🔔 **Procedural Temple Audio (Web Audio API)**:
  - Harmonic brass temple bells synthesized procedurally (no external audio files needed).
  - Resonant Ghanta strikes, sacred chime chimes, and solemn conch tones.
- 🎨 **Traditional Indian Temple Aesthetics**:
  - Warm brass, vermillion (kumkum), saffron, and midnight indigo color palette.
  - Living temple night sky with floating golden dust and falling marigold petals.
  - Brass plaque UI borders with ornate toran garlands and Devanagari typography (*Tiro Devanagari Hindi*, *Cinzel Decorative*).

---

## 🎮 How to Play

1. **Aim & Bless**: Tap or click any approaching obstacle (*Vighna*) to unleash Ganesha's spinning golden Parashu axe.
2. **Collect Offerings**: Tap falling festival offerings (Modaks, Lotuses, Durva Grass, Dhols) for bonus points, health restoration, and divine buffs.
3. **Build Combos**: Defeat obstacles rapidly in succession to elevate your combo multiplier up to 10x.
4. **Protect the Sanctum**: Prevent obstacles from touching the outer sacred mandala. If all 5 diyas go dark, the game ends.

---

## 🚀 Getting Started

No build tools required for the frontend — it's pure HTML/CSS/JS.

### Option 1: Direct Browser (frontend only)
Simply double-click [`index.html`](index.html) to open the game in any modern web browser (Chrome, Edge, Firefox, Safari).
> Note: scoreboard persistence needs the backend (Option 2). Without it, scores are kept in `localStorage` only.

### Option 2: Production Server (recommended — frontend + Excel scoreboard API)
Requires Python 3.10+.

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure (optional — only needed for voice/TTS features)
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
# then set ELEVENLABS_API_KEY inside .env

# 3. Run
python server.py          # defaults to http://localhost:8080
python server.py 8000     # …or pick a port (env PORT wins)
```
Then visit `http://localhost:8080` in your browser.

**API endpoints**

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check (`{"ok": true}`) |
| GET | `/api/campuses` | NIAT campus list |
| GET | `/api/scores` | Scoreboard sessions + campus rankings |
| POST | `/api/score` | Submit a score (validated, capped) |
| GET | `/api/download-excel` | Download `vighnaharta_scores.xlsx` |
| POST | `/api/tts` | ElevenLabs TTS proxy (needs `ELEVENLABS_API_KEY`, else 503) |

**Docker**

```bash
docker build -t vighnaharta .
docker run -p 8080:8080 vighnaharta
```

### 🛡️ Production notes
- Secrets live in the environment (`.env`, never committed). If you previously used a hardcoded API key, **rotate it** — it is in git history.
- The live scoreboard `vighnaharta_scores.xlsx` is auto-created on first score and is git-ignored; to stop tracking the seed copy run `git rm --cached vighnaharta_scores.xlsx`.
- The server only serves whitelisted public files (`index.html`, `game.js`, `style.css`, `assets/…`); source files, `.env`, and `.git` return 404, and API responses are `no-store` with `nosniff` / `SAMEORIGIN` headers.

---

## 🛠️ Tech Stack

- **Graphics**: HTML5 Canvas 2D (60 FPS, particle physics, procedural glow shaders)
- **UI & Layout**: Semantic HTML5, CSS3 Glassmorphism, SVG vectors, Google Fonts
- **Audio**: Web Audio API (Synthesized acoustic temple bells, chimes, and resonance)
- **Architecture**: Pure Vanilla JavaScript with zero external frameworks or heavy dependencies
- **Backend**: Python `http.server` (threaded) + `openpyxl` Excel scoreboard, validated JSON API, Docker-ready

---

## 📜 License

Created with devotion for the **Ganesh Chaturthi Game Design Contest**.  
Open source under the MIT License.

*गणपति बप्पा मोरया! मंगल मूर्ति मोरया!*
