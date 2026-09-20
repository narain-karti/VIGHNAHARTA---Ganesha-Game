// ============================================================
// VIGHNAHARTA — The Obstacle Breaker
// Traditional Indian Devotional Pixel-Art Arcade Engine
// गणेश चतुर्थी महोत्सव
// ============================================================

(() => {
'use strict';

// --- Canvas & DPR Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, cx = 0, cy = 0, dpr = 1;
let mandalaR = 0, spawnR = 0, tapR = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = canvas.width = window.innerWidth * dpr;
  H = canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  cx = W / 2;
  cy = H / 2;
  // Sacred centre mandala radius scales nicely with screen size
  mandalaR = Math.max(65 * dpr, Math.min(W, H) * 0.115);
  spawnR = Math.hypot(W, H) / 2 + 70 * dpr;
  tapR = Math.max(38 * dpr, 42);
}
window.addEventListener('resize', resize);
resize();

// --- Traditional Devotional Palette ---
const C = {
  saffron: '#FF6B00',
  gold: '#FFD700',
  goldLight: '#FFF59D',
  brassMid: '#D4AF37',
  brassDark: '#8C6314',
  marigold: '#FFC107',
  vermillion: '#C62828',
  cream: '#FFF8E1',
  night: '#1A0533',
  purple: '#4A148C',
  vighnaDark: '#2D0A4E',
  vighnaCore: '#150024',
  thornGreen: '#2E7D32',
  thornDark: '#1B4D20',
  diyaAmber: '#FF8F00',
  stoneGray: '#5D5D63',
  stoneDark: '#2D2D32',
  stoneHighlight: '#B0B0B8'
};

// --- Game State System ---
const STATE = { TITLE: 0, PLAYING: 1, WAVE_TRANS: 2, GAME_OVER: 3, VICTORY: 4 };
let state = STATE.TITLE;

let score = 0;
let bestScore = parseInt(localStorage.getItem('vighnaharta_best') || '0', 10);
let blessings = 5;
let wave = 1;
let combo = 0;
let comboTimer = 0;
let bestCombo = 0;
let aura = 0;
const maxAura = 100;
let obstaclesCleared = 0;
let waveMisses = 0;
let eclipseAlpha = 0;
let eclipseFlashTimer = 0;
let isLightning = false;

let waveObsCount = 8;
let waveObsSpawned = 0;
let spawnInterval = 1.8;
let spawnTimer = 0;
let transTimer = 0;
let lastTime = 0;

// Screen effects
let flashAlpha = 0;
let shakeX = 0, shakeY = 0, shakeTimer = 0, shakeIntensity = 0;
let hitStopTimer = 0; // micro-pause (50-70ms) for impact feel
let centrePulseTime = 0;

// Collections
let obstacles = [];
let particles = [];
let petals = []; // falling marigold petals
let starDust = []; // ambient golden dust
let lanterns = []; // floating festive sky lanterns (Akash Kandils)
let incenseSmoke = []; // fragrant sacred incense curls from sanctum
let blessingBolts = [];
let powerups = [];
let textPopups = [];
let impactSeals = []; // expanding sacred yantras
let closeSaveRings = [];

// Power-up state
let slowActive = 0;
let autoActive = 0;
let autoShootTimer = 0;
let puTimer = 0;

// Temple Audio & Visual Cue States
let droneOsc1 = null, droneOsc2 = null, droneGain = null;
let tutorialAlpha = 0;
let firstKillDone = false;
let ganeshaSlashArc = 0;
let ganeshaSlashAngle = 0;

// --- Ganesha Sacred Center Asset ---
const ganeshaImg = new Image();
ganeshaImg.src = 'assets/ganesha.jpg';
let imgLoaded = false;
ganeshaImg.onload = () => { imgLoaded = true; };

// --- Parashu & Sacred Seal Assets (from Design Sheet) ---
const parashuImg = new Image();
parashuImg.src = 'assets/parashu.png';
let parashuLoaded = false;
parashuImg.onload = () => { parashuLoaded = true; };

const sealImg = new Image();
sealImg.src = 'assets/sacred_seal.png';
let sealLoaded = false;
sealImg.onload = () => { sealLoaded = true; };

// --- 8-Directional Ganesha Sprites (from User Design Sheet) ---
const DIR_KEYS = ['up', 'up_right', 'right', 'down_right', 'down', 'down_left', 'left', 'up_left'];
const ganeshaSprites = {};
let spritesLoaded = 0;

DIR_KEYS.forEach(key => {
  const img = new Image();
  img.src = `assets/sprites/ganesha_${key}.png`;
  img.onload = () => { spritesLoaded++; };
  ganeshaSprites[key] = img;
});

function getDirectionKey(angle) {
  let a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const sector = Math.floor(((a + Math.PI / 8) % (Math.PI * 2)) / (Math.PI / 4));
  switch (sector) {
    case 0: return 'right';
    case 1: return 'down_right';
    case 2: return 'down';
    case 3: return 'down_left';
    case 4: return 'left';
    case 5: return 'up_left';
    case 6: return 'up';
    case 7: return 'up_right';
    default: return 'down';
  }
}

// Directional Ganesha Aiming & Attack Animation State (8-direction support)
let currentDirection = 'down';
let ganeshaAimAngle = Math.PI / 2; // Default facing down towards player
let ganeshaTargetAngle = Math.PI / 2;
let aimTimer = 0;
let ganeshaAttackFlash = 0; // Weapon release charge flash

// --- DOM UI References ---
const uiHud = document.getElementById('hud');
const uiTitleScreen = document.getElementById('titleScreen');
const uiGameOverScreen = document.getElementById('gameOverScreen');
const uiHudScore = document.getElementById('hudScore');
const uiHudWaveText = document.getElementById('hudWaveText');
const uiComboBadge = document.getElementById('comboBadge');
const uiComboText = document.getElementById('comboText');
const uiAuraMeterFill = document.getElementById('auraMeterFill');
const uiAuraMeterText = document.getElementById('auraMeterText');
const uiActivePowerups = document.getElementById('activePowerups');
const uiTitleBestScore = document.getElementById('titleBestScore');
const uiBtnPlay = document.getElementById('btnPlay');
const uiBtnRestart = document.getElementById('btnRestart');
const uiBtnAudioToggle = document.getElementById('btnAudioToggle');
const uiAudioIcon = document.getElementById('audioIcon');
const uiAudioStatusText = document.getElementById('audioStatusText');
const uiGoScore = document.getElementById('goScore');
const uiGoBest = document.getElementById('goBest');
const uiGoWave = document.getElementById('goWave');
const uiGoCleared = document.getElementById('goCleared');
const uiGoCombo = document.getElementById('goCombo');
const uiNewBestBanner = document.getElementById('newBestBanner');

if (uiTitleBestScore) {
  uiTitleBestScore.textContent = bestScore.toLocaleString();
}

// --- Procedural Temple Audio Engine (Web Audio API) ---
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Temple bell synthesizer (fundamental + bell overtone decay)
function playTempleBell(freq, duration = 0.8, volume = 0.2) {
  if (!audioCtx || !soundEnabled) return;
  try {
    const now = audioCtx.currentTime;
    
    // Fundamental tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + duration);

    // High overtone shimmer (metal resonance)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.76, now);
    gain2.gain.setValueAtTime(volume * 0.35, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + duration * 0.4);
  } catch (err) {
    // Audio safe fallback
  }
}

// Indian classical Raga scale notes (Bilawal / Bhairav inspired)
const RAGA_NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C5 to C6

// Continuous Meditative Indian Tanpura Drone (Sa-Pa C3 & G2)
function startTempleDrone() {
  if (!audioCtx || !soundEnabled || droneGain) return;
  try {
    const now = audioCtx.currentTime;
    droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.035, now + 3.0); // Gentle sacred ambient swell

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    droneOsc1 = audioCtx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.setValueAtTime(130.81, now); // C3 fundamental (Sa)

    droneOsc2 = audioCtx.createOscillator();
    droneOsc2.type = 'sine';
    droneOsc2.frequency.setValueAtTime(98.00, now); // G2 fifth (Pa)

    droneOsc1.connect(filter);
    droneOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(audioCtx.destination);

    droneOsc1.start(now);
    droneOsc2.start(now);
  } catch (e) {}
}

function stopTempleDrone() {
  if (!droneGain || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    setTimeout(() => {
      if (droneOsc1) { try { droneOsc1.stop(); droneOsc1.disconnect(); } catch (e) {} droneOsc1 = null; }
      if (droneOsc2) { try { droneOsc2.stop(); droneOsc2.disconnect(); } catch (e) {} droneOsc2 = null; }
      if (droneGain) { try { droneGain.disconnect(); } catch (e) {} droneGain = null; }
    }, 650);
  } catch (e) {}
}

function sfxTapBlessing() {
  playTempleBell(880, 0.25, 0.15);
}

function sfxDestroy(comboLevel) {
  const noteIdx = Math.min(comboLevel, RAGA_NOTES.length - 1);
  const freq = RAGA_NOTES[noteIdx];
  playTempleBell(freq, 0.5, 0.22);
}

function sfxCloseSave() {
  playTempleBell(1318.5, 1.2, 0.3); // High E6 ring
  setTimeout(() => playTempleBell(1567.98, 0.9, 0.2), 60); // High G6 resonance
  const rack = document.getElementById('diyaRack');
  if (rack) {
    rack.classList.remove('diya-surge');
    void rack.offsetWidth;
    rack.classList.add('diya-surge');
    setTimeout(() => { if (rack) rack.classList.remove('diya-surge'); }, 650);
  }
}

function sfxMiss() {
  if (!audioCtx || !soundEnabled) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch(e) {}
}

function sfxPowerup() {
  playTempleBell(659.25, 0.3, 0.18);
  setTimeout(() => playTempleBell(783.99, 0.35, 0.2), 70);
  setTimeout(() => playTempleBell(1046.50, 0.6, 0.25), 140);
}

function sfxWaveComplete() {
  playTempleBell(523.25, 0.8, 0.2);
  setTimeout(() => playTempleBell(659.25, 0.8, 0.2), 100);
  setTimeout(() => playTempleBell(783.99, 1.2, 0.25), 200);
}

function sfxGameOver() {
  playTempleBell(523.25, 0.5, 0.2);
  setTimeout(() => playTempleBell(440.00, 0.6, 0.2), 180);
  setTimeout(() => playTempleBell(329.63, 1.0, 0.25), 380);
}

// --- Ambient Environment Particles ---
function initAmbient() {
  starDust = [];
  petals = [];
  lanterns = [];
  incenseSmoke = [];

  // Floating temple golden dust
  for (let i = 0; i < 45; i++) {
    starDust.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 8 * dpr,
      vy: -(12 + Math.random() * 22) * dpr,
      size: (1.5 + Math.random() * 2.5) * dpr,
      alpha: 0.2 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2
    });
  }

  // Tumbling Marigold Petals
  for (let i = 0; i < 18; i++) {
    petals.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: (20 + Math.random() * 35) * dpr,
      vx: (Math.random() - 0.5) * 15 * dpr,
      angle: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 2,
      w: (7 + Math.random() * 5) * dpr,
      h: (12 + Math.random() * 7) * dpr,
      color: Math.random() > 0.4 ? C.marigold : C.saffron,
      alpha: 0.35 + Math.random() * 0.4
    });
  }

  // Floating Festive Sky Lanterns (Akash Kandils)
  for (let i = 0; i < 4; i++) {
    lanterns.push({
      x: (W * 0.15) + (i * (W * 0.25)) + (Math.random() - 0.5) * 60 * dpr,
      y: Math.random() * H,
      vy: -(8 + Math.random() * 8) * dpr,
      size: (15 + Math.random() * 7) * dpr,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 1.2 + Math.random() * 0.8,
      alpha: 0.55 + Math.random() * 0.3,
      color: i % 2 === 0 ? '#FF9800' : '#FF5722'
    });
  }
}

function updateAmbient(dt) {
  // Update Golden Dust
  for (let p of starDust) {
    p.y += p.vy * dt;
    p.x += p.vx * dt + Math.sin(p.pulse) * 0.4 * dpr;
    p.pulse += dt * 2;
    if (p.y < -10) {
      p.y = H + 10;
      p.x = Math.random() * W;
    }
  }

  // Update Marigold Petals
  for (let p of petals) {
    p.y += p.vy * dt;
    p.x += p.vx * dt + Math.sin(p.angle) * 10 * dt;
    p.angle += p.vRot * dt;
    if (p.y > H + 20) {
      p.y = -20;
      p.x = Math.random() * W;
    }
  }

  // Update Festive Sky Lanterns (Akash Kandils)
  for (let l of lanterns) {
    l.y += l.vy * dt;
    l.sway += l.swaySpeed * dt;
    l.x += Math.sin(l.sway) * 10 * dt;
    if (l.y < -60 * dpr) {
      l.y = H + 60 * dpr;
      l.x = Math.random() * W;
    }
  }

  // Emit fragrant incense wisps from 4 plinth corner points
  if (mandalaR > 0 && Math.random() > 0.45) {
    const plinthCorner = mandalaR * 0.72;
    const corners = [
      { x: cx - plinthCorner, y: cy - plinthCorner },
      { x: cx + plinthCorner, y: cy - plinthCorner },
      { x: cx - plinthCorner, y: cy + plinthCorner },
      { x: cx + plinthCorner, y: cy + plinthCorner }
    ];
    const c = corners[Math.floor(Math.random() * corners.length)];
    incenseSmoke.push({
      x: c.x,
      y: c.y,
      vx: (Math.random() - 0.5) * 8 * dpr,
      vy: -(22 + Math.random() * 18) * dpr,
      life: 0.9 + Math.random() * 0.4,
      maxLife: 1.3,
      size: (2.5 + Math.random() * 2) * dpr,
      sway: Math.random() * Math.PI * 2
    });
  }

  for (let i = incenseSmoke.length - 1; i >= 0; i--) {
    const s = incenseSmoke[i];
    s.x += s.vx * dt + Math.sin(s.sway) * 8 * dt;
    s.y += s.vy * dt;
    s.sway += dt * 3;
    s.size += 6 * dt * dpr;
    s.life -= dt;
    if (s.life <= 0) incenseSmoke.splice(i, 1);
  }
}

function drawAmbient() {
  // 1. Floating Festive Sky Lanterns (Distant Background Layer)
  for (let l of lanterns) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.globalAlpha = l.alpha;

    // Outer lantern glow
    const halo = ctx.createRadialGradient(0, 0, 2 * dpr, 0, 0, l.size * 1.6);
    halo.addColorStop(0, 'rgba(255, 235, 59, 0.35)');
    halo.addColorStop(0.5, 'rgba(255, 111, 0, 0.12)');
    halo.addColorStop(1, 'rgba(255, 111, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, l.size * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Geometric diamond lantern body (Akash Kandil)
    ctx.fillStyle = l.color;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, -l.size);
    ctx.lineTo(l.size * 0.65, 0);
    ctx.lineTo(0, l.size);
    ctx.lineTo(-l.size * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner bright candle flame
    ctx.fillStyle = '#FFFDE7';
    ctx.beginPath();
    ctx.arc(0, 0, l.size * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Hanging festive paper tassels swaying below
    const tasselSway = Math.sin(l.sway * 1.5) * (3.5 * dpr);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(-l.size * 0.3, l.size);
    ctx.lineTo(-l.size * 0.3 + tasselSway, l.size + 13 * dpr);
    ctx.moveTo(0, l.size);
    ctx.lineTo(tasselSway, l.size + 17 * dpr);
    ctx.moveTo(l.size * 0.3, l.size);
    ctx.lineTo(l.size * 0.3 + tasselSway, l.size + 13 * dpr);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Floating Golden Dust
  for (let p of starDust) {
    const a = p.alpha * (0.8 + Math.sin(p.pulse) * 0.2);
    ctx.globalAlpha = a;
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); // Pixel art square dust
    ctx.fill();
  }

  // 3. Tumbling Marigold Petals
  for (let p of petals) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Fragrant Sacred Incense Smoke Wisps (Dhupa)
  for (let s of incenseSmoke) {
    const a = Math.max(0, s.life / s.maxLife) * 0.26;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Living Temple Night Background ---
function drawBackground() {
  // Clear canvas so CSS background image is visible
  ctx.clearRect(0, 0, W, H);

  // Glowing Chaturthi Crescent Moon
  ctx.save();
  const moonX = W * 0.82;
  const moonY = H * 0.22;
  const moonR = 45 * dpr;
  // Moon Aura
  const moonAura = ctx.createRadialGradient(moonX, moonY, moonR*0.8, moonX, moonY, moonR*3);
  moonAura.addColorStop(0, 'rgba(255, 248, 225, 0.25)');
  moonAura.addColorStop(1, 'rgba(255, 248, 225, 0)');
  ctx.fillStyle = moonAura;
  ctx.beginPath(); ctx.arc(moonX, moonY, moonR*3, 0, Math.PI * 2); ctx.fill();
  
  // Moon Body (Crescent)
  ctx.fillStyle = '#FFF8E1';
  ctx.shadowColor = '#FFF8E1';
  ctx.shadowBlur = 15 * dpr;
  ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(moonX - 12*dpr, moonY - 12*dpr, moonR, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Drifting Nocturnal Clouds (Parallax Layer 1)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 5; i++) {
    const cloudX = ((i * 400 * dpr + centrePulseTime * 15) % (W + 400 * dpr)) - 200 * dpr;
    const cloudY = H * 0.15 + i * 50 * dpr;
    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, 120 * dpr, 40 * dpr, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + 60*dpr, cloudY - 20*dpr, 80 * dpr, 50 * dpr, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm Golden radial glow behind the sacred centre
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, mandalaR * 3.2);
  coreGlow.addColorStop(0, 'rgba(255, 215, 0, 0.16)');
  coreGlow.addColorStop(0.4, 'rgba(255, 107, 0, 0.08)');
  coreGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, W, H);

  // Subtle Temple Radial Rays (slow rotation)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(centrePulseTime * 0.04);
  const numRays = 16;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.015)';
  for (let i = 0; i < numRays; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a1 = (i / numRays) * Math.PI * 2;
    const a2 = a1 + (Math.PI / numRays) * 0.5;
    ctx.arc(0, 0, spawnR, a1, a2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 1. Concentric Temple Courtyard Flagstones (Prakaram Stone Floor)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.035)';
  ctx.lineWidth = 1.2 * dpr;
  const flagstoneRadii = [mandalaR * 1.55, mandalaR * 2.2, mandalaR * 2.9, mandalaR * 3.7, mandalaR * 4.5];
  for (let rad of flagstoneRadii) {
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  const flagstoneSectors = 24;
  for (let i = 0; i < flagstoneSectors; i++) {
    const a = (i / flagstoneSectors) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (mandalaR * 1.55), Math.sin(a) * (mandalaR * 1.55));
    ctx.lineTo(Math.cos(a) * (mandalaR * 4.5), Math.sin(a) * (mandalaR * 4.5));
    ctx.stroke();
  }
  ctx.restore();

  // 2. Subtle Sacred Geometry / Rangoli background watermark
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
  ctx.lineWidth = 1 * dpr;
  const numOuterPetals = 8;
  const outerR = mandalaR * 2.8;
  for (let i = 0; i < numOuterPetals; i++) {
    const a = (i / numOuterPetals) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * outerR * 0.6, Math.sin(a) * outerR * 0.6, outerR * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Distant Gopuram & Temple Pillar Silhouettes (Parallax Layer 2)
  drawTempleSilhouettes();
}

function drawTempleSilhouettes() {
  ctx.save();
  // Very slow continuous scroll to the left
  const parallaxOffset = -(centrePulseTime * 8) % (300 * dpr);
  ctx.translate(parallaxOffset, 0);

  ctx.fillStyle = 'rgba(14, 3, 28, 0.65)';
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
  ctx.lineWidth = 1 * dpr;

  const gopW = 75 * dpr;
  const gopH = 140 * dpr;
  const baseY = H;
  
  // Draw repeating sequence of Gopurams to cover wider scrolled area
  for (let s = -1; s <= 2; s++) {
    const baseX = s * (W * 0.6) + 10 * dpr;
    
    // Tiered Shikhara
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX, baseY - gopH * 0.4);
    ctx.lineTo(baseX + 8 * dpr, baseY - gopH * 0.4);
    ctx.lineTo(baseX + 8 * dpr, baseY - gopH * 0.7);
    ctx.lineTo(baseX + 16 * dpr, baseY - gopH * 0.7);
    ctx.lineTo(baseX + 25 * dpr, baseY - gopH);
    ctx.lineTo(baseX + 34 * dpr, baseY - gopH * 0.7);
    ctx.lineTo(baseX + 42 * dpr, baseY - gopH * 0.7);
    ctx.lineTo(baseX + 42 * dpr, baseY - gopH * 0.4);
    ctx.lineTo(baseX + 50 * dpr, baseY - gopH * 0.4);
    ctx.lineTo(baseX + 50 * dpr, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Kalasham on Spire
    ctx.fillStyle = C.brassMid;
    ctx.beginPath();
    ctx.arc(baseX + 25 * dpr, baseY - gopH - 4 * dpr, 3.2 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(14, 3, 28, 0.65)'; // restore color for next
  }
  ctx.restore();
}

// --- Central Sacred Mandala (8 Concentric Layers) ---
function drawMandala(dt) {
  centrePulseTime += dt;
  const breath = 1 + Math.sin(centrePulseTime * 1.8) * 0.035;
  const r = mandalaR * breath;

  ctx.save();
  ctx.translate(cx, cy);

  // LAYER 1: Soft Golden Divine Halo
  const haloGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6);
  haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.28)');
  haloGrad.addColorStop(0.5, 'rgba(255, 143, 0, 0.12)');
  haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // TEMPLE SANCTUM BASE: Stepped Octagonal Granite Plinth (Jagati / Adhishthana)
  const octR = r * 1.48;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * octR;
    const py = Math.sin(a) * octR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(28, 12, 42, 0.88)';
  ctx.fill();
  ctx.strokeStyle = C.brassDark;
  ctx.lineWidth = 3.5 * dpr;
  ctx.stroke();

  // Plinth Inner Gold Bevel
  const octInnerR = r * 1.38;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * octInnerR;
    const py = Math.sin(a) * octInnerR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = C.brassMid;
  ctx.lineWidth = 1.8 * dpr;
  ctx.stroke();

  // 8 Corner Brass Brackets (Kirtimukha Bosses)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bx = Math.cos(a) * octR;
    const by = Math.sin(a) * octR;
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(bx, by, 3.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4 CARDINAL SACRED GATEWAYS (Dwaras / Toranas at North, South, East, West)
  for (let g = 0; g < 4; g++) {
    ctx.save();
    ctx.rotate(g * (Math.PI / 2));

    // Flanking Stone/Brass Gateway Pillars (Intricate Vector Carvings)
    ctx.fillStyle = C.brassMid;
    ctx.strokeStyle = C.brassDark;
    ctx.lineWidth = 1 * dpr;
    const pillX = r * 0.38;
    const pillY1 = -r * 1.25;
    const pillY2 = -r * 1.52;
    const pillW = 6 * dpr;
    const pillH = pillY1 - pillY2;

    // Helper to draw an ornate pillar
    const drawPillar = (x, y, w, h) => {
      // Base
      ctx.fillRect(x - w*0.8, y + h - w, w*1.6, w);
      ctx.strokeRect(x - w*0.8, y + h - w, w*1.6, w);
      // Shaft (fluted)
      ctx.fillRect(x - w/2, y + w, w, h - w*2);
      ctx.strokeRect(x - w/2, y + w, w, h - w*2);
      ctx.beginPath();
      ctx.moveTo(x - w*0.2, y + w); ctx.lineTo(x - w*0.2, y + h - w);
      ctx.moveTo(x + w*0.2, y + w); ctx.lineTo(x + w*0.2, y + h - w);
      ctx.stroke();
      // Capital (Yali/Lotus carved block)
      ctx.fillRect(x - w, y, w*2, w*1.2);
      ctx.strokeRect(x - w, y, w*2, w*1.2);
      ctx.beginPath();
      ctx.arc(x, y + w*0.6, w*0.5, 0, Math.PI*2);
      ctx.stroke();
    };

    // Left pillar
    drawPillar(-pillX, pillY2, pillW, pillH);
    // Right pillar
    drawPillar(pillX, pillY2, pillW, pillH);

    // Makara Torana arch beam (Scalloped ornate arch)
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(-pillX - 6 * dpr, pillY2);
    ctx.quadraticCurveTo(-pillX/2, pillY2 - 12 * dpr, 0, pillY2 - 18 * dpr);
    ctx.quadraticCurveTo(pillX/2, pillY2 - 12 * dpr, pillX + 6 * dpr, pillY2);
    ctx.lineTo(pillX - 4 * dpr, pillY2);
    ctx.quadraticCurveTo(pillX/2, pillY2 - 10 * dpr, 0, pillY2 - 14 * dpr);
    ctx.quadraticCurveTo(-pillX/2, pillY2 - 10 * dpr, -pillX + 4 * dpr, pillY2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hanging miniature brass bell (Ghanta) swaying with temple breathing
    const bellSway = Math.sin(centrePulseTime * 2.8 + g) * (2.8 * dpr);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, pillY2);
    ctx.lineTo(bellSway, pillY2 + 10 * dpr);
    ctx.stroke();

    // Bell body
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(bellSway, pillY2 + 13 * dpr, 3.2 * dpr, Math.PI, 0, false);
    ctx.lineTo(bellSway + 4.2 * dpr, pillY2 + 17 * dpr);
    ctx.lineTo(bellSway - 4.2 * dpr, pillY2 + 17 * dpr);
    ctx.closePath();
    ctx.fill();

    // Stepped threshold stone (Chandrashila)
    ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.beginPath();
    ctx.arc(0, -r * 1.22, 14 * dpr, Math.PI, 0, false);
    ctx.fill();

    ctx.restore();
  }

  // LAYER 8: Danger Threshold Ring (Alert halo when obstacles are near)
  let closestDist = Infinity;
  for (const o of obstacles) {
    const d = Math.hypot(o.x - cx, o.y - cy);
    if (d < closestDist) closestDist = d;
  }
  const dangerFactor = Math.max(0, 1 - (closestDist - r) / (mandalaR * 2.2));
  if (dangerFactor > 0.05) {
    ctx.strokeStyle = C.vermillion;
    ctx.lineWidth = (2 + dangerFactor * 3) * dpr;
    ctx.globalAlpha = dangerFactor * (0.4 + Math.sin(centrePulseTime * 10) * 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // LAYER 7: Outer Sacred Boundary Ring
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.5 * dpr;
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 14 * dpr;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // LAYER 6: Diya & Dot Motifs Ring (24 golden sacred dots)
  const dotCount = 24;
  ctx.fillStyle = C.marigold;
  for (let i = 0; i < dotCount; i++) {
    const a = (i / dotCount) * Math.PI * 2;
    const dotX = Math.cos(a) * (r * 1.15);
    const dotY = Math.sin(a) * (r * 1.15);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.2 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  // LAYER 5: Ornamental Geometric Ring (Sawtooth / temple dentils)
  ctx.strokeStyle = C.brassMid;
  ctx.lineWidth = 1.8 * dpr;
  ctx.beginPath();
  const dentils = 36;
  for (let i = 0; i <= dentils; i++) {
    const a = (i / dentils) * Math.PI * 2;
    const rad = i % 2 === 0 ? r * 1.08 : r * 1.02;
    const dx = Math.cos(a) * rad;
    const dy = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(dx, dy);
    else ctx.lineTo(dx, dy);
  }
  ctx.closePath();
  ctx.stroke();

  // LAYER 4: Rangoli Sacred Geometry (Kolam interlace)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1.5 * dpr;
  const rangoliPetals = 8;
  for (let i = 0; i < rangoliPetals; i++) {
    ctx.save();
    ctx.rotate((i / rangoliPetals) * Math.PI * 2 + centrePulseTime * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.35, -r * 0.8, r * 0.35, -r * 1.0, 0, -r * 0.98);
    ctx.bezierCurveTo(-r * 0.35, -r * 1.0, -r * 0.35, -r * 0.8, 0, -r * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  // LAYER 3: Sculpted Lotus-Petal Ring (16 traditional petals)
  const lotusCount = 16;
  for (let i = 0; i < lotusCount; i++) {
    ctx.save();
    ctx.rotate((i / lotusCount) * Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 107, 0, 0.35)' : 'rgba(255, 193, 7, 0.35)';
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.22, -r * 0.85, 0, -r * 0.96);
    ctx.quadraticCurveTo(-r * 0.22, -r * 0.85, 0, -r * 0.72);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // LAYER 2: Sacred Ganesha Centerpiece Frame
  // Ornate circular brass medallion enclosing Ganesha
  const innerMurtiR = r * 0.68;

  // Brass Medallion Rim
  ctx.strokeStyle = C.brassMid;
  ctx.lineWidth = 4 * dpr;
  ctx.beginPath();
  ctx.arc(0, 0, innerMurtiR, 0, Math.PI * 2);
  ctx.stroke();

  // Fine inner gold thread
  ctx.strokeStyle = C.goldLight;
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.arc(0, 0, innerMurtiR - 2.5 * dpr, 0, Math.PI * 2);
  ctx.stroke();

  // Draw Lord Ganesha Respectful Seated Artwork (with 8-directional sprites & breathing)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, innerMurtiR - 3.5 * dpr, 0, Math.PI * 2);
  ctx.clip();

  // Idle breathing vertical bob (matching Idle Animation in design sheet)
  const idleBob = Math.sin(centrePulseTime * 2.8) * (2.4 * dpr);
  ctx.translate(0, idleBob);

  // Directional aim timer decrement
  if (aimTimer > 0) {
    aimTimer -= dt;
    currentDirection = getDirectionKey(ganeshaAimAngle);
  } else {
    currentDirection = 'down'; // Return to calm front seated idle
  }

  // Draw active 8-directional Ganesha sprite from user design sheet
  const activeSprite = ganeshaSprites[currentDirection];
  if (activeSprite && activeSprite.complete && activeSprite.naturalWidth > 0) {
    const spriteAspect = activeSprite.naturalWidth / activeSprite.naturalHeight;
    const spriteH = innerMurtiR * 1.88;
    const spriteW = spriteH * spriteAspect;
    ctx.drawImage(activeSprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
  } else if (imgLoaded) {
    const imgSize = innerMurtiR * 2.15;
    ctx.drawImage(ganeshaImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
  } else {
    // Fallback golden sacred Om
    ctx.fillStyle = C.gold;
    ctx.font = `bold ${innerMurtiR * 0.9}px "Tiro Devanagari Hindi", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ॐ', 0, 0);
  }

  // Flanking Traditional Standing Brass Lamps (Kuthu Vilakku / Samai)
  const lampOffsets = [-innerMurtiR * 0.72, innerMurtiR * 0.72];
  for (let lx of lampOffsets) {
    ctx.save();
    ctx.translate(lx, innerMurtiR * 0.12);

    // Lamp stepped base
    ctx.fillStyle = C.brassMid;
    ctx.fillRect(-6 * dpr, 14 * dpr, 12 * dpr, 3 * dpr);
    // Slender pillar
    ctx.fillRect(-1.5 * dpr, -8 * dpr, 3 * dpr, 22 * dpr);
    // Oil reservoir bowl
    ctx.beginPath();
    ctx.arc(0, -8 * dpr, 5.5 * dpr, 0, Math.PI);
    ctx.fill();

    // Flickering Golden Flame with gentle lamp aura
    const flameFlicker = Math.sin(centrePulseTime * 6 + (lx > 0 ? 1.5 : 0)) * (0.8 * dpr);
    const lampAura = ctx.createRadialGradient(0, -14 * dpr, 1 * dpr, 0, -14 * dpr, 13 * dpr);
    lampAura.addColorStop(0, 'rgba(255, 235, 59, 0.45)');
    lampAura.addColorStop(1, 'rgba(255, 143, 0, 0)');
    ctx.fillStyle = lampAura;
    ctx.beginPath();
    ctx.arc(0, -14 * dpr, 13 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Teardrop lamp flame
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(0, -18 * dpr + flameFlicker);
    ctx.quadraticCurveTo(2.5 * dpr, -13 * dpr, 0, -10 * dpr);
    ctx.quadraticCurveTo(-2.5 * dpr, -13 * dpr, 0, -18 * dpr + flameFlicker);
    ctx.fill();

    ctx.restore();
  }

  // Attack Release Flash at Ganesha's weapon hand
  if (ganeshaAttackFlash > 0) {
    ctx.fillStyle = `rgba(255, 235, 59, ${ganeshaAttackFlash * 0.75})`;
    ctx.beginPath();
    ctx.arc(0, 0, innerMurtiR * 0.7 * ganeshaAttackFlash, 0, Math.PI * 2);
    ctx.fill();
    ganeshaAttackFlash = Math.max(0, ganeshaAttackFlash - dt * 4);
  }

  // Martial Golden Weapon Release Crescent Arc
  if (ganeshaSlashArc > 0) {
    ctx.save();
    ctx.rotate(ganeshaSlashAngle);
    ctx.strokeStyle = `rgba(255, 215, 0, ${ganeshaSlashArc})`;
    ctx.lineWidth = 4 * dpr * ganeshaSlashArc;
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 12 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, innerMurtiR * 1.15, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
    ctx.restore();
    ganeshaSlashArc = Math.max(0, ganeshaSlashArc - dt * 4.5);
  }

  // Warm golden temple wash overlay for visual cohesion
  ctx.fillStyle = 'rgba(255, 215, 0, 0.06)';
  ctx.fillRect(-innerMurtiR, -innerMurtiR, innerMurtiR * 2, innerMurtiR * 2);
  ctx.restore();

  ctx.restore();
}

// --- Obstacle Type Definitions & Behaviors ---
const OBS_CONFIG = {
  WISP: {
    name: 'SHADOW WISP',
    baseSpeed: 52,
    hp: 1,
    points: 10,
    radius: 16
  },
  THORN: {
    name: 'THORN CLUSTER',
    baseSpeed: 68,
    hp: 1,
    points: 15,
    radius: 17
  },
  STONE: {
    name: 'STONE BLOCK',
    baseSpeed: 42,
    hp: 2,
    points: 25,
    radius: 21
  },
  SWARM: {
    name: 'DARK SWARM',
    baseSpeed: 82,
    hp: 1,
    points: 20,
    radius: 15
  },
  BOSS: {
    name: 'MAHAVIGHNA',
    baseSpeed: 40,
    hp: 1, // Special logic for boss hp
    points: 1000,
    radius: 40
  },
  ORB: {
    name: 'HEAVY ORB',
    baseSpeed: 80,
    hp: 1,
    points: 30,
    radius: 12
  }
};

function spawnObstacle() {
  let pool = ['WISP'];
  if (wave >= 2) pool.push('THORN');
  if (wave >= 4) pool.push('STONE');
  if (wave >= 6) pool.push('SWARM');

  // Wave 10 is the Boss Fight
  if (wave === 10) {
    if (waveObsSpawned === 0) {
      // Spawn Boss
      const angle = Math.random() * Math.PI * 2;
      const dist = W * 0.9;
      obstacles.push({
        type: 'BOSS',
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        hp: 10, // Boss needs 10 reflected orbs
        rot: 0,
        rotSpeed: 1.5,
        animTime: 0,
        radius: OBS_TYPES['BOSS'].radius * dpr,
        points: OBS_TYPES['BOSS'].points,
        angle: angle,
        shootTimer: 2.0
      });
      // Set a fake high count so it doesn't trigger wave end immediately
      waveObsCount = 999;
    }
    // Spawn occasional wisps to keep player busy
    pool = ['WISP'];
  }

  const type = pool[Math.floor(Math.random() * pool.length)];
  const cfg = OBS_CONFIG[type];

  // Spawn around outer circle perimeter
  const angle = Math.random() * Math.PI * 2;
  const x = cx + Math.cos(angle) * spawnR;
  const y = cy + Math.sin(angle) * spawnR;

  // Aim toward center with slight natural drift
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy);
  const speed = (cfg.baseSpeed + wave * 7) * dpr;

  const obs = {
    x, y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    type,
    radius: cfg.radius * dpr,
    hp: cfg.hp,
    maxHp: cfg.hp,
    points: cfg.points,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    animTime: Math.random() * 10,
    trail: [],
    // For Dark Swarm sub-particles
    swarmOffsets: []
  };

  if (type === 'SWARM') {
    for (let i = 0; i < 14; i++) {
      obs.swarmOffsets.push({
        radius: (6 + Math.random() * 10) * dpr,
        angle: (i / 14) * Math.PI * 2,
        speed: 2 + Math.random() * 2.5,
        size: (2.2 + Math.random() * 1.8) * dpr
      });
    }
  }

  obstacles.push(obs);
}

// --- Obstacle Rendering Pipelines ---
function drawObstacles() {
  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y);

    // 1. SHADOW WISP (Dark swirling smoke orb, irregular silhouette)
    if (o.type === 'WISP') {
      const pulse = 1 + Math.sin(o.animTime * 4) * 0.12;
      const r = o.radius * pulse;

      // Swirling smoke rings
      ctx.strokeStyle = 'rgba(74, 20, 140, 0.4)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, o.rot, o.rot + Math.PI * 1.5);
      ctx.stroke();

      // Smoke body gradient
      const wispGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      wispGrad.addColorStop(0, '#6A1B9A');
      wispGrad.addColorStop(0.6, C.vighnaDark);
      wispGrad.addColorStop(1, C.vighnaCore);
      ctx.fillStyle = wispGrad;
      ctx.shadowColor = '#9C27B0';
      ctx.shadowBlur = 10 * dpr;

      // Irregular smoke blob
      ctx.beginPath();
      const points = 7;
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;
        const offset = Math.sin(a * 3 + o.animTime * 5) * (3 * dpr);
        const px = Math.cos(a) * (r + offset);
        const py = Math.sin(a) * (r + offset);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Subtle Indian geometric fragments inside smoke body
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(-r * 0.25, -r * 0.25, r * 0.5, r * 0.5);

      // Glowing dark core
      ctx.fillStyle = '#E1BEE7';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. THORN CLUSTER (Dark forest green organic seed + sharp thorns + gold vein cracks)
    else if (o.type === 'THORN') {
      const r = o.radius;
      ctx.rotate(o.rot);

      // Thorns radiating outward (6 sharp thorns)
      ctx.fillStyle = C.thornDark;
      ctx.strokeStyle = C.thornGreen;
      ctx.lineWidth = 1.5 * dpr;
      const thornCount = 6;
      for (let i = 0; i < thornCount; i++) {
        ctx.save();
        ctx.rotate((i / thornCount) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(-4 * dpr, -r * 0.5);
        ctx.lineTo(0, -r * 1.4);
        ctx.lineTo(4 * dpr, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Central dark seed core
      ctx.fillStyle = '#112F15';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Subtle gold cracks in core
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.3);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.4, -r * 0.1);
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.1, r * 0.4);
      ctx.stroke();
    }

    // 3. STONE BLOCK (Ancient temple stone fragment + cracks + geometric engravings)
    else if (o.type === 'STONE') {
      const s = o.radius;
      ctx.rotate(o.rot);

      // Stone block body (octagonal chiseled block)
      ctx.fillStyle = C.stoneDark;
      ctx.strokeStyle = C.stoneGray;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      const cut = s * 0.35;
      ctx.moveTo(-s + cut, -s);
      ctx.lineTo(s - cut, -s);
      ctx.lineTo(s, -s + cut);
      ctx.lineTo(s, s - cut);
      ctx.lineTo(s - cut, s);
      ctx.lineTo(-s + cut, s);
      ctx.lineTo(-s, s - cut);
      ctx.lineTo(-s, -s + cut);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Carved Indian geometric engraving on surface
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);

      // If damaged (1st hit): Deep glowing fissure cracks spread across stone
      if (o.hp < o.maxHp) {
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = C.gold;
        ctx.shadowBlur = 8 * dpr;
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, -s * 0.6);
        ctx.lineTo(-s * 0.1, -s * 0.1);
        ctx.lineTo(s * 0.2, s * 0.4);
        ctx.lineTo(s * 0.8, s * 0.7);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 4. DARK SWARM (14 tiny dark-violet ethereal orbs orbiting unstable core)
    else if (o.type === 'SWARM') {
      ctx.fillStyle = '#7B1FA2';
      ctx.shadowColor = '#BA68C8';
      ctx.shadowBlur = 6 * dpr;

      // Draw each orbiting micro-particle
      for (const p of o.swarmOffsets) {
        const a = p.angle + o.animTime * p.speed;
        const px = Math.cos(a) * p.radius;
        const py = Math.sin(a) * p.radius;
        ctx.beginPath();
        ctx.arc(px, py, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Unstable central dark nucleus
      ctx.fillStyle = C.vighnaCore;
      ctx.beginPath();
      ctx.arc(0, 0, 4 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Directional Danger Threat Indicators (screen edge cues)
  const edgeMargin = 40 * dpr;
  for (const o of obstacles) {
    if (o.x < edgeMargin || o.x > W - edgeMargin || o.y < edgeMargin || o.y > H - edgeMargin) {
      const edgeX = Math.max(edgeMargin, Math.min(W - edgeMargin, o.x));
      const edgeY = Math.max(edgeMargin, Math.min(H - edgeMargin, o.y));
      const angle = Math.atan2(cy - edgeY, cx - edgeX);

      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(angle);
      const pulse = 0.55 + Math.sin(centrePulseTime * 8) * 0.4;
      ctx.fillStyle = o.type === 'STONE' ? C.stoneHighlight : (o.type === 'SWARM' ? '#BA68C8' : C.vermillion);
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8 * dpr;
      ctx.beginPath();
      // Pulsing diamond arrow pointing inward toward sanctum
      ctx.moveTo(11 * dpr, 0);
      ctx.lineTo(0, -6 * dpr);
      ctx.lineTo(-4 * dpr, 0);
      ctx.lineTo(0, 6 * dpr);
      ctx.closePath();
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.restore();
    }
  }
}

// --- Power-ups (Traditional Offerings - NO EMOJIS!) ---
const PU_CONFIG = [
  { type: 'LOTUS', label: 'DIVINE SERENITY', desc: 'Time Slowed' },
  { type: 'MODAK', label: 'MAHA PRASAD', desc: 'Obstacles Cleared' },
  { type: 'DURVA', label: 'DIVINE WILL', desc: 'Auto Blessings' },
  { type: 'DHOL', label: 'SACRED RESONANCE', desc: 'Shockwave Cleared' }
];

function trySpawnPowerup(dt) {
  if (wave < 2) return;
  puTimer += dt;
  if (puTimer > 18 + Math.random() * 12) {
    puTimer = 0;
    const cfg = PU_CONFIG[Math.floor(Math.random() * PU_CONFIG.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = mandalaR * 1.8 + Math.random() * mandalaR * 2.2;

    powerups.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      type: cfg.type,
      label: cfg.label,
      desc: cfg.desc,
      radius: 22 * dpr,
      life: 9.0,
      animTime: 0
    });
  }
}

function updatePowerups(dt) {
  slowActive = Math.max(0, slowActive - dt);
  autoActive = Math.max(0, autoActive - dt);

  // Auto-bless divine will effect
  if (autoActive > 0 && obstacles.length > 0) {
    autoShootTimer += dt;
    if (autoShootTimer >= 0.28) {
      autoShootTimer = 0;
      // Seek closest obstacle to center
      let closestIdx = -1;
      let minD = Infinity;
      for (let i = 0; i < obstacles.length; i++) {
        const d = Math.hypot(obstacles[i].x - cx, obstacles[i].y - cy);
        if (d < minD) { minD = d; closestIdx = i; }
      }
      if (closestIdx >= 0) {
        destroyObstacle(closestIdx, true);
      }
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.life -= dt;
    p.animTime += dt;
    if (p.life <= 0) powerups.splice(i, 1);
  }

  updateActivePowerupDOM();
}

function updateActivePowerupDOM() {
  if (!uiActivePowerups) return;
  let html = '';
  if (slowActive > 0) {
    html += `<div class="powerup-pill" style="color: #F48FB1;"><span>🪷</span> SLOW (${slowActive.toFixed(1)}s)</div>`;
  }
  if (autoActive > 0) {
    html += `<div class="powerup-pill" style="color: #81C784;"><span>🌿</span> AUTO BLESS (${autoActive.toFixed(1)}s)</div>`;
  }
  uiActivePowerups.innerHTML = html;
}

// Handcrafted SVG/Canvas Rendering of Traditional Offerings
function drawPowerups() {
  for (const p of powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const pulse = 1 + Math.sin(p.animTime * 4) * 0.12;
    const r = p.radius * pulse;

    // Sacred golden halo behind offering
    const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.5);
    halo.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
    halo.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 1. LOTUS (Sacred pink & white tiered lotus blossom with gold center)
    if (p.type === 'LOTUS') {
      const petalsCount = 8;
      for (let i = 0; i < petalsCount; i++) {
        ctx.save();
        ctx.rotate((i / petalsCount) * Math.PI * 2);
        ctx.fillStyle = '#F8BBD0';
        ctx.strokeStyle = '#F06292';
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.6, 0, -r * 0.9);
        ctx.quadraticCurveTo(-r * 0.3, -r * 0.6, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Golden central stamen
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. MODAK (Sculpted golden sweet with visible ridges and sparkle)
    else if (p.type === 'MODAK') {
      // Golden modak teardrop with scalloped ridges
      ctx.fillStyle = C.gold;
      ctx.strokeStyle = C.brassMid;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.8, -r * 0.1, r * 0.65, r * 0.75);
      ctx.lineTo(-r * 0.65, r * 0.75);
      ctx.quadraticCurveTo(-r * 0.8, -r * 0.1, 0, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ridge lines
      ctx.strokeStyle = '#FFE082';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.lineTo(0, r * 0.75);
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.35, 0, r * 0.3, r * 0.75);
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(-r * 0.35, 0, -r * 0.3, r * 0.75);
      ctx.stroke();
    }

    // 3. DURVA (Trio of sacred green grass blades tied in golden seal)
    else if (p.type === 'DURVA') {
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = 'round';
      // Blade 1 (left)
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.6, 0, -r * 0.7, -r * 0.8);
      ctx.stroke();
      // Blade 2 (center)
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.lineTo(0, -r * 0.95);
      ctx.stroke();
      // Blade 3 (right)
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.quadraticCurveTo(r * 0.6, 0, r * 0.7, -r * 0.8);
      ctx.stroke();
      // Gold tie seal
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(0, r * 0.3, 4 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. DHOL (Traditional temple percussion drum with saffron cloth)
    else if (p.type === 'DHOL') {
      const dw = r * 1.3, dh = r * 0.8;
      // Drum cylinder
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      // Saffron ceremonial sash across drum
      ctx.fillStyle = C.saffron;
      ctx.fillRect(-dw / 4, -dh / 2, dw / 2, dh);
      // Drum heads
      ctx.fillStyle = C.cream;
      ctx.strokeStyle = C.brassMid;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.ellipse(-dw / 2, 0, 4 * dpr, dh / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(dw / 2, 0, 4 * dpr, dh / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    ctx.restore();
  }
}

function activatePowerup(pu) {
  sfxPowerup();
  score += 15;
  addPopup(pu.x, pu.y - 30 * dpr, pu.label, C.gold, 18);
  emitBlessingParticles(pu.x, pu.y, 25, C.gold);

  switch (pu.type) {
    case 'MODAK':
      // Clear all active obstacles with golden shockwave
      triggerShake(6 * dpr, 0.35);
      for (let i = obstacles.length - 1; i >= 0; i--) {
        emitBlessingParticles(obstacles[i].x, obstacles[i].y, 14, C.gold);
        obstaclesCleared++;
      }
      obstacles = [];
      closeSaveRings.push({ x: cx, y: cy, r: 0, maxR: spawnR, life: 0.6, maxLife: 0.6 });
      break;

    case 'LOTUS':
      slowActive = 5.5;
      break;

    case 'DURVA':
      autoActive = 4.0;
      autoShootTimer = 0;
      break;

    case 'DHOL':
      // Outer ring shockwave
      triggerShake(8 * dpr, 0.4);
      closeSaveRings.push({ x: cx, y: cy, r: 0, maxR: spawnR * 0.8, life: 0.5, maxLife: 0.5 });
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const d = Math.hypot(obstacles[i].x - cx, obstacles[i].y - cy);
        if (d > mandalaR * 1.6) {
          emitBlessingParticles(obstacles[i].x, obstacles[i].y, 12, C.saffron);
          obstaclesCleared++;
          obstacles.splice(i, 1);
        }
      }
      break;
  }
}

// --- Divine Weapon Projectiles: Golden Parashu & Sacred Thread ---
function launchBlessing(targetX, targetY) {
  // Ganesha rotates to face the direction of your tap/click (matching design sheet)
  ganeshaAimAngle = Math.atan2(targetY - cy, targetX - cx);
  currentDirection = getDirectionKey(ganeshaAimAngle);
  aimTimer = 0.75; // Hold directional aiming pose
  ganeshaAttackFlash = 1.0;
  ganeshaSlashArc = 1.0; // Golden crescent slash arc
  ganeshaSlashAngle = ganeshaAimAngle;
  firstKillDone = true; // Dismiss tutorial cue on player interaction

  // Arc path with natural Bezier curve
  const midX = (cx + targetX) / 2 + (Math.random() - 0.5) * 50 * dpr;
  const midY = (cy + targetY) / 2 + (Math.random() - 0.5) * 50 * dpr;

  blessingBolts.push({
    x0: cx, y0: cy,
    x1: midX, y1: midY,
    x2: targetX, y2: targetY,
    t: 0,
    speed: 5.2, // Fast, punchy arcade flight time (~0.18s)
    spin: 0,
    trail: []
  });
}

function updateBolts(dt) {
  for (let i = blessingBolts.length - 1; i >= 0; i--) {
    const b = blessingBolts[i];
    b.t += dt * b.speed;
    b.spin += dt * 25; // Rapid spinning golden battle-axe

    const t = Math.min(1, b.t);
    const bx = (1 - t) * (1 - t) * b.x0 + 2 * (1 - t) * t * b.x1 + t * t * b.x2;
    const by = (1 - t) * (1 - t) * b.y0 + 2 * (1 - t) * t * b.y1 + t * t * b.y2;

    b.trail.push({ x: bx, y: by, life: 0.22 });
    if (b.trail.length > 10) b.trail.shift();

    for (let j = b.trail.length - 1; j >= 0; j--) {
      b.trail[j].life -= dt;
      if (b.trail[j].life <= 0) b.trail.splice(j, 1);
    }

    // Emit spark particles along projectile trail
    if (Math.random() > 0.4) {
      particles.push({
        x: bx + (Math.random() - 0.5) * 8 * dpr,
        y: by + (Math.random() - 0.5) * 8 * dpr,
        vx: (Math.random() - 0.5) * 20 * dpr,
        vy: (Math.random() - 0.5) * 20 * dpr,
        life: 0.25, maxLife: 0.25,
        size: 3 * dpr,
        color: C.gold,
        isPetal: false,
        rot: 0, vRot: 0
      });
    }

    if (b.t >= 1) {
      blessingBolts.splice(i, 1);
    }
  }
}

function drawBolts() {
  for (const b of blessingBolts) {
    const t = Math.min(1, b.t);

    // Quadratic Bezier current tip
    const bx = (1 - t) * (1 - t) * b.x0 + 2 * (1 - t) * t * b.x1 + t * t * b.x2;
    const by = (1 - t) * (1 - t) * b.y0 + 2 * (1 - t) * t * b.y1 + t * t * b.y2;

    // 1. Radiant Golden Curved Motion Trail (Step 3: Projectile Trail)
    if (b.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let j = 1; j < b.trail.length; j++) {
        ctx.lineTo(b.trail[j].x, b.trail[j].y);
      }
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
      ctx.lineWidth = 6 * dpr;
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = C.gold;
      ctx.shadowBlur = 10 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 2. Flying Spinning Golden Parashu (Divine Axe)
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(b.spin);

    // Golden sacred aura around the weapon
    const axeHalo = ctx.createRadialGradient(0, 0, 3 * dpr, 0, 0, 20 * dpr);
    axeHalo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    axeHalo.addColorStop(0.35, 'rgba(255, 215, 0, 0.7)');
    axeHalo.addColorStop(1, 'rgba(255, 143, 0, 0)');
    ctx.fillStyle = axeHalo;
    ctx.beginPath();
    ctx.arc(0, 0, 20 * dpr, 0, Math.PI * 2);
    ctx.fill();

    const axeSize = 34 * dpr;
    if (parashuLoaded) {
      ctx.drawImage(parashuImg, -axeSize / 2, -axeSize / 2, axeSize, axeSize);
    } else {
      // Procedural fallback double-axe
      ctx.fillStyle = C.gold;
      ctx.fillRect(-2 * dpr, -axeSize / 2, 4 * dpr, axeSize);
      ctx.beginPath();
      ctx.arc(-8 * dpr, -8 * dpr, 10 * dpr, -Math.PI / 2, Math.PI / 2);
      ctx.arc(8 * dpr, -8 * dpr, 10 * dpr, Math.PI / 2, -Math.PI / 2, true);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Multi-tier Particle Explosions & Sacred Seals ---
function emitBlessingParticles(x, y, count, baseColor, isCloseSave = false) {
  const palette = [C.gold, C.saffron, C.marigold, '#FFF8E1'];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (60 + Math.random() * (isCloseSave ? 200 : 130)) * dpr;
    const isPetal = Math.random() > 0.55;

    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.55 + Math.random() * 0.4,
      maxLife: 0.85,
      size: (isPetal ? 7 : 4) * dpr,
      color: palette[Math.floor(Math.random() * palette.length)],
      isPetal,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 8
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.rot += p.vRot * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update Expanding Sacred Seals (Impact Effect)
  for (let i = impactSeals.length - 1; i >= 0; i--) {
    const s = impactSeals[i];
    s.r += 80 * dpr * dt;
    s.life -= dt;
    if (s.life <= 0) impactSeals.splice(i, 1);
  }

  // Update Close Save Expanding Shockwaves
  for (let i = closeSaveRings.length - 1; i >= 0; i--) {
    const r = closeSaveRings[i];
    r.r += (r.maxR - r.r) * 8 * dt;
    r.life -= dt;
    if (r.life <= 0) closeSaveRings.splice(i, 1);
  }
}

function drawParticles() {
  // Sacred Expanding Seals (Step 4: Impact Effect)
  for (const s of impactSeals) {
    const alpha = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = alpha;

    if (sealLoaded) {
      const sealSize = s.r * 2.2;
      ctx.drawImage(sealImg, -sealSize / 2, -sealSize / 2, sealSize, sealSize);
    } else {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = C.gold;
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(-s.r * 0.7, -s.r * 0.7, s.r * 1.4, s.r * 1.4);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // Close Save Expanding Rings
  for (const r of closeSaveRings) {
    const alpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 * dpr;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 15 * dpr;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Pixel particles & Marigold petal fragments (Step 5: Dissolve)
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.isPetal) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      // Smooth curvy petal shape
      ctx.moveTo(0, p.size * 0.8);
      ctx.quadraticCurveTo(p.size*0.7, p.size*0.3, 0, -p.size*0.8);
      ctx.quadraticCurveTo(-p.size*0.7, p.size*0.3, 0, p.size * 0.8);
      ctx.fill();
      ctx.restore();
    } else {
      // Smooth glowing circle spark
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// --- Floating Text Popups ---
function addPopup(x, y, text, color = C.gold, size = 16) {
  textPopups.push({
    x, y,
    text,
    color,
    size: size * dpr,
    life: 0.9,
    maxLife: 0.9
  });
}

function updatePopups(dt) {
  for (let i = textPopups.length - 1; i >= 0; i--) {
    const t = textPopups[i];
    t.y -= 35 * dpr * dt;
    t.life -= dt;
    if (t.life <= 0) textPopups.splice(i, 1);
  }

  // Tutorial prompt fading logic
  if (wave === 1 && !firstKillDone) {
    tutorialAlpha = Math.min(1, tutorialAlpha + dt * 2);
  } else {
    tutorialAlpha = Math.max(0, tutorialAlpha - dt * 2.5);
  }
}

function drawPopups() {
  for (const t of textPopups) {
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6 * dpr;
    ctx.fillText(t.text, t.x, t.y);
    ctx.shadowBlur = 0;
  }

  // Wave 1 First-Play Tutorial Banner
  if (wave === 1 && !firstKillDone && tutorialAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = tutorialAlpha;
    ctx.fillStyle = C.gold;
    ctx.font = `600 ${Math.max(13 * dpr, 14)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8 * dpr;
    ctx.fillText('✦ Tap approaching Vighnas to invoke Ganesha\'s Parashu ✦', cx, cy - mandalaR * 1.85);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

// --- Obstacle Destruction Handler ---
function destroyObstacle(idx, isAuto = false) {
  const o = obstacles[idx];
  if (!o) return;

  // Launch Divine Golden Energy Thread from center to obstacle
  launchBlessing(o.x, o.y);

  o.hp--;
  if (o.hp > 0) {
    // Stone block cracked on first hit
    sfxDestroy(0);
    emitBlessingParticles(o.x, o.y, 8, C.stoneHighlight);
    addPopup(o.x, o.y - 15 * dpr, 'CRACK!', C.gold, 13);
    return;
  }

  // Hit-Stop impact pause (55ms) for juicy arcade feel
  hitStopTimer = 0.055;

  // Impact Sacred Yantra Seal
  impactSeals.push({
    x: o.x, y: o.y,
    r: 12 * dpr,
    life: 0.35, maxLife: 0.35,
    rot: Math.random() * Math.PI
  });

  // Calculate distance from center for CLOSE SAVE bonus
  const distFromCenter = Math.hypot(o.x - cx, o.y - cy);
  const isCloseSave = distFromCenter < (mandalaR * 1.55);

  let pts = o.points;

  // Combo system
  combo++;
  comboTimer = 1.6;
  if (combo > bestCombo) bestCombo = combo;
  const multiplier = Math.min(combo, 5);
  pts *= multiplier;

  if (isCloseSave) {
    pts += 35;
    sfxCloseSave();
    addPopup(o.x, o.y - 40 * dpr, 'CLOSE SAVE! +35', '#FFFFFF', 16);
    closeSaveRings.push({ x: o.x, y: o.y, r: 10 * dpr, maxR: 75 * dpr, life: 0.45, maxLife: 0.45 });
    triggerShake(5 * dpr, 0.25);
    aura = Math.min(maxAura, aura + 15);
    updateHUDAura();
  } else {
    sfxDestroy(multiplier);
  }

  score += pts;
  obstaclesCleared++;

  // Emit rich marigold + gold particle bursts
  emitBlessingParticles(o.x, o.y, isCloseSave ? 32 : 18, C.gold, isCloseSave);

  // Stone Block breaks into multiple stone chunks and bronze dust
  if (o.type === 'STONE') {
    for (let c = 0; c < 8; c++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 85) * dpr;
      particles.push({
        x: o.x, y: o.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.6, maxLife: 0.6,
        size: (5 + Math.random() * 4) * dpr,
        color: Math.random() > 0.5 ? C.stoneDark : C.stoneGray,
        isPetal: false,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10
      });
    }
  }

  // Dark Swarm compresses inward with gold flash and explodes into particles
  if (o.type === 'SWARM') {
    closeSaveRings.push({ x: o.x, y: o.y, r: 4 * dpr, maxR: 45 * dpr, life: 0.3, maxLife: 0.3 });
    for (let s = 0; s < 16; s++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (70 + Math.random() * 100) * dpr;
      particles.push({
        x: o.x, y: o.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.45, maxLife: 0.45,
        size: (2.5 + Math.random() * 2) * dpr,
        color: Math.random() > 0.4 ? C.gold : '#BA68C8',
        isPetal: false,
        rot: 0, vRot: 0
      });
    }
  }

  addPopup(o.x, o.y - 20 * dpr, `+${pts}`, C.gold, combo > 1 ? 19 : 14);

  // Update DOM HUD Score & Combo
  updateHUDScore();
  updateHUDCombo();

  obstacles.splice(idx, 1);
}

// --- Screen Shake System ---
function triggerShake(intensity, dur) {
  shakeIntensity = intensity;
  shakeTimer = dur;
}

function updateShake(dt) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
    shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
  } else {
    shakeX = 0;
    shakeY = 0;
  }
}

// --- Wave Progression System ---
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function toRoman(num) {
  return ROMAN_NUMERALS[num - 1] || `${num}`;
}

function startWave() {
  wave++;
  spawnInterval = Math.max(0.45, 1.9 - wave * 0.14);
  // Spawn first obstacle quickly (0.25s) so action starts immediately
  spawnTimer = spawnInterval - 0.25;
  waveObsCount = 8 + wave * 3;
  waveObsSpawned = 0;
  waveMisses = 0;
  state = STATE.PLAYING;

  if (uiHudWaveText) {
    uiHudWaveText.textContent = `WAVE ${toRoman(wave)}`;
  }
}

function checkWaveEnd() {
  if (waveObsSpawned >= waveObsCount && obstacles.length === 0) {
    sfxWaveComplete();
    const bonus = waveMisses === 0 ? 250 : 50;
    score += bonus;
    updateHUDScore();

    emitBlessingParticles(cx, cy, 35, C.gold);
    if (waveMisses === 0) {
      addPopup(cx, cy - mandalaR * 1.8, '✨ PERFECT WAVE! +250 ✨', C.gold, 22);
    } else {
      addPopup(cx, cy - mandalaR * 1.8, `WAVE ${toRoman(wave)} COMPLETE! +${bonus}`, C.marigold, 18);
    }

    state = STATE.WAVE_TRANS;
    transTimer = 1.8;
  }
}

// --- UI DOM Sync Handlers ---
function updateHUDScore() {
  if (uiHudScore) {
    uiHudScore.textContent = score.toLocaleString();
  }
}

function updateHUDAura() {
  if (!uiAuraMeterFill || !uiAuraMeterText) return;
  const pct = Math.min(100, Math.max(0, (aura / maxAura) * 100));
  uiAuraMeterFill.style.width = `${pct}%`;
  uiAuraMeterText.textContent = `AURA (${Math.floor(pct)}%)`;
  
  if (pct >= 100) {
    uiAuraMeterFill.classList.add('full');
    uiAuraMeterText.textContent = `MAHA-AARTI READY!`;
  } else {
    uiAuraMeterFill.classList.remove('full');
  }
}

function updateHUDCombo() {
  if (!uiComboBadge || !uiComboText) return;
  if (combo >= 2) {
    uiComboBadge.classList.add('is-active');
    uiComboText.textContent = `x${Math.min(combo, 5)} COMBO`;
  } else {
    uiComboBadge.classList.remove('is-active');
  }
}

function updateDiyasHUD() {
  for (let i = 0; i < 5; i++) {
    const el = document.getElementById(`diya-${i}`);
    if (el) {
      if (i < blessings) {
        el.classList.remove('is-extinguished');
      } else {
        el.classList.add('is-extinguished');
      }
    }
  }
}

// --- Game Loop Lifecycle ---
function startGame() {
  initAudio();
  if (soundEnabled) {
    startTempleDrone();
  }
  tutorialAlpha = 1.0;
  firstKillDone = false;
  score = 0;
  blessings = 5;
  wave = 0;
  combo = 0;
  comboTimer = 0;
  bestCombo = 0;
  obstaclesCleared = 0;
  waveMisses = 0;

  obstacles = [];
  particles = [];
  powerups = [];
  textPopups = [];
  blessingBolts = [];
  impactSeals = [];
  closeSaveRings = [];

  puTimer = 0;
  slowActive = 0;
  autoActive = 0;
  flashAlpha = 0;

  updateHUDScore();
  updateHUDAura();
  updateDiyasHUD();

  // Hide Title Screen & Game Over Screen, show HUD
  if (uiTitleScreen) uiTitleScreen.style.display = 'none';
  if (uiGameOverScreen) uiGameOverScreen.style.display = 'none';
  if (uiHud) uiHud.style.display = 'flex';

  startWave();
}

function gameOver() {
  state = STATE.GAME_OVER;
  sfxGameOver();
  stopTempleDrone();

  const isNewBest = score > bestScore;
  if (isNewBest) {
    bestScore = score;
    localStorage.setItem('vighnaharta_best', `${bestScore}`);
    // Large golden particle celebration for new best score
    emitBlessingParticles(cx, cy, 65, C.gold, true);
    closeSaveRings.push({ x: cx, y: cy, r: 10 * dpr, maxR: spawnR * 0.9, life: 0.9, maxLife: 0.9 });
    for (let k = 0; k < 25; k++) {
      petals.push({
        x: cx + (Math.random() - 0.5) * 200 * dpr,
        y: cy + (Math.random() - 0.5) * 200 * dpr,
        vy: (25 + Math.random() * 40) * dpr,
        vx: (Math.random() - 0.5) * 30 * dpr,
        angle: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4,
        w: (8 + Math.random() * 6) * dpr,
        h: (14 + Math.random() * 8) * dpr,
        color: Math.random() > 0.4 ? C.marigold : C.saffron,
        alpha: 0.8
      });
    }
  }

  // Populate Game Over screen stats
  if (uiGoScore) uiGoScore.textContent = score.toLocaleString();
  if (uiGoBest) uiGoBest.textContent = bestScore.toLocaleString();
  if (uiGoWave) uiGoWave.textContent = toRoman(wave);
  if (uiGoCleared) uiGoCleared.textContent = obstaclesCleared.toLocaleString();
  if (uiGoCombo) uiGoCombo.textContent = `x${bestCombo}`;

  if (uiNewBestBanner) {
    uiNewBestBanner.style.display = isNewBest ? 'block' : 'none';
  }

  // Hide HUD, Show Game Over Screen
  if (uiHud) uiHud.style.display = 'none';
  if (uiGameOverScreen) uiGameOverScreen.style.display = 'flex';
}

let pointerActive = false;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerCurrentX = 0;
let pointerCurrentY = 0;
let swipeTrail = [];

function triggerMahaAarti() {
  aura = 0;
  updateHUDAura();
  sfxWaveComplete(); // Reuse satisfying sound
  triggerShake(15 * dpr, 0.8);

  // Massive visual burst at center
  emitBlessingParticles(cx, cy, 100, C.gold, true);
  closeSaveRings.push({ x: cx, y: cy, r: 20 * dpr, maxR: W * 1.5, life: 1.0, maxLife: 1.0 });

  // Destroy all obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    score += o.points * 10; // Massive bonus
    emitBlessingParticles(o.x, o.y, 15, C.gold);
    obstacles.splice(i, 1);
  }
  updateHUDScore();
  addPopup(cx, cy - mandalaR * 2, 'MAHA-AARTI!', C.gold, 32);
}

// --- Player Input Handling ---
function handlePlayerTap(tapX, tapY) {
  initAudio();
  if (state !== STATE.PLAYING) return;

  // 1. Check Power-up collection first
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    const dist = Math.hypot(tapX - p.x, tapY - p.y);
    if (dist < p.radius + tapR) {
      activatePowerup(p);
      powerups.splice(i, 1);
      return;
    }
  }

  // 1.5 Check for Maha-Aarti Trigger (tap center when aura is full)
  const distToCenter = Math.hypot(tapX - cx, tapY - cy);
  if (distToCenter < mandalaR && aura >= maxAura) {
    triggerMahaAarti();
    return;
  }

  // 2. Check Obstacles (target closest to tap) - ignore STONE on tap
  let closestIdx = -1;
  let closestDist = Infinity;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === OBS_TYPES.STONE) continue; // Stones require swipe
    const dist = Math.hypot(tapX - o.x, tapY - o.y);
    if (dist < o.radius + tapR && dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  if (closestIdx >= 0) {
    destroyObstacle(closestIdx);
  } else {
    // Sacred golden blessing ripple on empty tap
    impactSeals.push({
      x: tapX, y: tapY,
      r: 6 * dpr,
      life: 0.22, maxLife: 0.22,
      rot: Math.random() * Math.PI
    });
    sfxTapBlessing();
  }
}

function handlePlayerSwipe(startX, startY, endX, endY) {
  if (state !== STATE.PLAYING) return;
  // Check if swipe crossed any STONE obstacle or ORB
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'STONE' || o.type === 'ORB') {
      const dist = distToSegment(o.x, o.y, startX, startY, endX, endY);
      if (dist < o.radius * 1.5) {
        if (o.type === 'ORB' && !o.isDeflected) {
          // Deflect orb towards boss
          let boss = obstacles.find(obs => obs.type === 'BOSS');
          if (boss) {
            o.isDeflected = true;
            const targetDist = Math.hypot(boss.x - o.x, boss.y - o.y);
            o.vx = ((boss.x - o.x) / targetDist) * OBS_TYPES['ORB'].baseSpeed * 2.5; // Fast return
            o.vy = ((boss.y - o.y) / targetDist) * OBS_TYPES['ORB'].baseSpeed * 2.5;
            emitBlessingParticles(o.x, o.y, 10, C.gold);
            addPopup(o.x, o.y, 'DEFLECTED!', C.gold, 20);
            return;
          }
        } else if (o.type === 'STONE') {
          destroyObstacle(i);
          return;
        }
      }
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Canvas & Window Input Listeners
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  pointerActive = true;
  pointerStartX = e.clientX * dpr;
  pointerStartY = e.clientY * dpr;
  pointerCurrentX = pointerStartX;
  pointerCurrentY = pointerStartY;
  swipeTrail = [{x: pointerStartX, y: pointerStartY}];
  handlePlayerTap(pointerStartX, pointerStartY);
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  if (!pointerActive) return;
  pointerCurrentX = e.clientX * dpr;
  pointerCurrentY = e.clientY * dpr;
  swipeTrail.push({x: pointerCurrentX, y: pointerCurrentY});
  if (swipeTrail.length > 10) swipeTrail.shift();
});

window.addEventListener('pointerup', (e) => {
  if (!pointerActive) return;
  pointerActive = false;
  const endX = e.clientX * dpr;
  const endY = e.clientY * dpr;
  const dist = Math.hypot(endX - pointerStartX, endY - pointerStartY);
  if (dist > 30 * dpr) {
    handlePlayerSwipe(pointerStartX, pointerStartY, endX, endY);
  }
  swipeTrail = [];
});



// DOM Button Listeners
if (uiBtnPlay) {
  uiBtnPlay.addEventListener('click', () => {
    startGame();
  });
}

if (uiBtnRestart) {
  uiBtnRestart.addEventListener('click', () => {
    startGame();
  });
}

if (uiBtnAudioToggle) {
  uiBtnAudioToggle.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      if (state === STATE.PLAYING) startTempleDrone();
    } else {
      stopTempleDrone();
    }
    if (uiAudioIcon) uiAudioIcon.textContent = soundEnabled ? '🔔' : '🔕';
    if (uiAudioStatusText) uiAudioStatusText.textContent = soundEnabled ? 'BELLS: ON' : 'BELLS: OFF';
  });
}

// --- Main 60FPS Game Loop ---
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Hit-stop micro freeze (impact pause)
  if (hitStopTimer > 0) {
    hitStopTimer -= dt;
    requestAnimationFrame(gameLoop);
    return;
  }

  // Ambient Environment Updates (Always running)
  updateAmbient(dt);
  updateParticles(dt);
  updatePopups(dt);
  updateBolts(dt);
  updateShake(dt);

  // Apply Screen Shake transform
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Draw living background and ambient particles
  drawBackground();
  drawAmbient();

  // Draw Central Sacred 8-Layer Mandala
  drawMandala(dt);

  if (state === STATE.PLAYING || state === STATE.WAVE_TRANS) {
    // Combo timer decrement
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 0;
        updateHUDCombo();
      }
    }

    // Spawn obstacles
    if (state === STATE.PLAYING) {
      spawnTimer += dt;
      const effectiveInterval = slowActive > 0 ? spawnInterval * 1.6 : spawnInterval;
      if (spawnTimer >= effectiveInterval && waveObsSpawned < waveObsCount) {
        spawnTimer = 0;
        spawnObstacle();
        waveObsSpawned++;
      }

      trySpawnPowerup(dt);
    }

    // Update Obstacles Movement & Miss Collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      const speedMult = slowActive > 0 ? 0.45 : 1.0;
      
      if (o.type === 'BOSS') {
        // Orbit around the center
        o.angle += (0.5 * speedMult) * dt;
        const dist = W * 0.9;
        o.x = cx + Math.cos(o.angle) * dist;
        o.y = cy + Math.sin(o.angle) * dist;
        
        // Shoot heavy orbs
        o.shootTimer -= dt;
        if (o.shootTimer <= 0) {
          o.shootTimer = 2.0 + Math.random() * 2.0;
          const targetDist = Math.hypot(cx - o.x, cy - o.y);
          obstacles.push({
            type: 'ORB',
            x: o.x, y: o.y,
            vx: ((cx - o.x) / targetDist) * OBS_TYPES['ORB'].baseSpeed,
            vy: ((cy - o.y) / targetDist) * OBS_TYPES['ORB'].baseSpeed,
            hp: OBS_TYPES['ORB'].hp, maxHp: OBS_TYPES['ORB'].hp,
            points: OBS_TYPES['ORB'].points,
            rot: 0, rotSpeed: 5, animTime: 0,
            radius: OBS_TYPES['ORB'].radius * dpr,
            trail: [], swarmOffsets: []
          });
        }
      } else if (o.type === 'ORB') {
        o.x += o.vx * speedMult * dt;
        o.y += o.vy * speedMult * dt;
        if (o.isDeflected) {
           let boss = obstacles.find(obs => obs.type === 'BOSS');
           if (boss && Math.hypot(boss.x - o.x, boss.y - o.y) < boss.radius) {
              boss.hp--;
              emitBlessingParticles(boss.x, boss.y, 30, C.gold);
              triggerShake(10 * dpr, 0.4);
              sfxCloseSave();
              obstacles.splice(i, 1);
              if (boss.hp <= 0) {
                 triggerMahaAarti();
                 state = STATE.VICTORY;
                 if (uiGameOverScreen) {
                   uiGameOverScreen.style.display = 'flex';
                   uiGameOverScreen.querySelector('h1').textContent = 'VICTORY';
                   const p = uiGameOverScreen.querySelector('p');
                   if (p) p.innerHTML = `The Eclipse is Broken<br>Score: ${score.toLocaleString()}`;
                 }
              }
              continue;
           }
        }
      } else {
        o.x += o.vx * speedMult * dt;
        o.y += o.vy * speedMult * dt;
      }

      // Thorn Cluster mild erratic trajectory sway
      if (o.type === 'THORN') {
        const hyp = Math.hypot(o.vx, o.vy) || 1;
        const perpX = -o.vy / hyp;
        const perpY = o.vx / hyp;
        const sway = Math.sin(o.animTime * 6) * 18 * dpr;
        o.x += perpX * sway * dt;
        o.y += perpY * sway * dt;
      }

      // Shadow Wisp trailing smoke particles
      if (o.type === 'WISP' && Math.random() > 0.6) {
        particles.push({
          x: o.x + (Math.random() - 0.5) * 6 * dpr,
          y: o.y + (Math.random() - 0.5) * 6 * dpr,
          vx: -o.vx * 0.15 + (Math.random() - 0.5) * 10 * dpr,
          vy: -o.vy * 0.15 + (Math.random() - 0.5) * 10 * dpr,
          life: 0.28, maxLife: 0.28,
          size: 2.8 * dpr,
          color: '#4A148C',
          isPetal: false,
          rot: 0, vRot: 0
        });
      }

      o.rot += o.rotSpeed * dt;
      o.animTime += dt;

      // Check if vighna reached inner sacred boundary
      const distToCenter = Math.hypot(o.x - cx, o.y - cy);
      if (distToCenter < mandalaR * 1.15 && o.type !== 'BOSS') {
        // Miss! Sacred boundary breached, 1 diya blessing lost
        obstacles.splice(i, 1);
        blessings--;
        waveMisses++;
        combo = 0;
        updateHUDCombo();
        updateDiyasHUD();

        flashAlpha = 0.35;
        sfxMiss();
        emitBlessingParticles(o.x, o.y, 16, C.vermillion);
        addPopup(o.x, o.y - 20 * dpr, 'BREACHED!', C.vermillion, 16);
        triggerShake(6 * dpr, 0.3);

        if (blessings <= 0) {
          blessings = 0;
          gameOver();
          break;
        }
      }
    }

    updatePowerups(dt);

    // Draw Entities
    drawObstacles();
    drawPowerups();
    drawBolts();
    drawParticles();
    drawPopups();

    // The Eclipse (Dark Mode) Logic - Waves 7-9
    if (wave >= 7 && wave <= 9) {
      // Manage eclipse alpha fade in/out
      if (eclipseAlpha < 0.95) eclipseAlpha += dt * 0.5;
      
      // Manage lightning flashes
      eclipseFlashTimer -= dt;
      if (eclipseFlashTimer <= 0) {
        if (Math.random() < 0.3) sfxTapBlessing(); // Hacky thunder sound
        eclipseFlashTimer = 2.0 + Math.random() * 4.0; // Flash every 2-6 seconds
        flashAlpha = 0.8; // Use existing flashAlpha for the lightning effect (white instead of red)
        isLightning = true;
      }

      ctx.save();
      // Only draw darkness if not lightning
      if (flashAlpha <= 0 || typeof isLightning === 'undefined' || !isLightning) {
        const eclipseGrad = ctx.createRadialGradient(cx, cy, mandalaR * 1.5, cx, cy, W);
        eclipseGrad.addColorStop(0, `rgba(5, 0, 15, 0)`);
        eclipseGrad.addColorStop(0.3, `rgba(5, 0, 15, ${eclipseAlpha * 0.8})`);
        eclipseGrad.addColorStop(1, `rgba(5, 0, 15, ${eclipseAlpha})`);
        ctx.fillStyle = eclipseGrad;
        ctx.fillRect(-W, -H, W * 3, H * 3);
      } else {
        // Lightning flash
        ctx.fillStyle = `rgba(255, 255, 240, ${flashAlpha})`;
        ctx.fillRect(-W, -H, W * 3, H * 3);
      }
      ctx.restore();
    } else {
      eclipseAlpha = 0; // reset
    }

    // Red screen flash on breach (or lightning fade)
    if (flashAlpha > 0) {
      if (!(wave >= 7 && wave <= 9 && typeof isLightning !== 'undefined' && isLightning)) {
        ctx.fillStyle = `rgba(198, 40, 40, ${flashAlpha})`;
        ctx.fillRect(-W, -H, W * 3, H * 3);
      }
      flashAlpha = Math.max(0, flashAlpha - dt * ((typeof isLightning !== 'undefined' && isLightning) ? 4.0 : 2.5));
      if (flashAlpha <= 0 && typeof isLightning !== 'undefined') {
        isLightning = false; // Reset lightning flag
      }
    }

    // Wave Transition delay
    if (state === STATE.WAVE_TRANS) {
      transTimer -= dt;
      const transAlpha = Math.sin((transTimer / 2.5) * Math.PI); // transTimer starts at 2.5
      
      // Soft gradient wave shift banner
      if (transAlpha > 0) {
        ctx.save();
        const waveGrad = ctx.createLinearGradient(0, cy - 80*dpr, 0, cy + 80*dpr);
        waveGrad.addColorStop(0, 'rgba(14, 3, 28, 0)');
        waveGrad.addColorStop(0.5, `rgba(40, 5, 80, ${transAlpha * 0.85})`);
        waveGrad.addColorStop(1, 'rgba(14, 3, 28, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fillRect(0, cy - 100*dpr, W, 200*dpr);
        
        ctx.fillStyle = `rgba(255, 215, 0, ${transAlpha})`;
        ctx.font = `bold ${42*dpr}px "Cinzel Decorative", serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10 * dpr;
        ctx.fillText(`WAVE ${toRoman(wave + 1)}`, cx, cy + 15*dpr);
        ctx.restore();
      }

      if (transTimer <= 0) {
        startWave();
      }
    } else if (state === STATE.PLAYING) {
      checkWaveEnd();
    }
  } else if (state === STATE.TITLE || state === STATE.GAME_OVER) {
    drawParticles();
    drawPopups();
  }

  // Draw Swipe Trail
  if (swipeTrail.length > 1) {
    ctx.beginPath();
    ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
    for (let i = 1; i < swipeTrail.length; i++) {
      ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
    }
    ctx.strokeStyle = '#FFD700'; // Gold
    ctx.lineWidth = 4 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10 * dpr;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// Initialize & Launch
initAmbient();
requestAnimationFrame(gameLoop);

})();
