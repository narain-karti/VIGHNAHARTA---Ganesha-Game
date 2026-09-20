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

No installations or build tools required!

### Option 1: Direct Browser
Simply double-click [`index.html`](index.html) to open the game in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Server (Optional)
If you prefer running through a local server:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js (npx)
npx serve .
```
Then visit `http://localhost:8000` in your browser.

---

## 🛠️ Tech Stack

- **Graphics**: HTML5 Canvas 2D (60 FPS, particle physics, procedural glow shaders)
- **UI & Layout**: Semantic HTML5, CSS3 Glassmorphism, SVG vectors, Google Fonts
- **Audio**: Web Audio API (Synthesized acoustic temple bells, chimes, and resonance)
- **Architecture**: Pure Vanilla JavaScript with zero external frameworks or heavy dependencies

---

## 📜 License

Created with devotion for the **Ganesh Chaturthi Game Design Contest**.  
Open source under the MIT License.

*गणपति बप्पा मोरया! मंगल मूर्ति मोरया!*
