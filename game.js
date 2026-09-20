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

// --- Grand Temple Background Artwork Asset ---
const bgTempleImg = new Image();
bgTempleImg.src = 'assets/bg_grand_temple.jpg';
let bgTempleLoaded = false;
bgTempleImg.onload = () => { bgTempleLoaded = true; };

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

// Devotee Profile & NIAT Campus Elements
const uiTitleDevoteeName = document.getElementById('titleDevoteeName');
const uiTitleDevoteeCampus = document.getElementById('titleDevoteeCampus');
const uiBtnSwitchDevotee = document.getElementById('btnSwitchDevotee');
const uiTitleDevoteeCard = document.getElementById('titleDevoteeCard');
const uiHudPlayerTag = document.getElementById('hudPlayerTag');
const uiHudPlayerName = document.getElementById('hudPlayerName');
const uiHudPlayerCampus = document.getElementById('hudPlayerCampus');
const uiGoDevoteeName = document.getElementById('goDevoteeName');
const uiGoDevoteeCampus = document.getElementById('goDevoteeCampus');
const uiBtnGoLeaderboard = document.getElementById('btnGoLeaderboard');
const uiBtnGoDevoteeCard = document.getElementById('btnGoDevoteeCard');

// Registration Modal Elements
const uiRegistrationModal = document.getElementById('registrationModal');
const uiInputDevoteeName = document.getElementById('inputDevoteeName');
const uiSelectNiatCampus = document.getElementById('selectNiatCampus');
const uiInputStudentId = document.getElementById('inputStudentId');
const uiBtnSaveRegistration = document.getElementById('btnSaveRegistration');
const uiBtnCancelRegistration = document.getElementById('btnCancelRegistration');

// Campus Scoreboard Modal Elements
const uiLeaderboardModal = document.getElementById('leaderboardModal');
const uiBtnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
const uiBtnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
const uiBtnCloseLeaderboardBottom = document.getElementById('btnCloseLeaderboardBottom');
const uiTabBtnCampuses = document.getElementById('tabBtnCampuses');
const uiTabBtnSessions = document.getElementById('tabBtnSessions');
const uiTableLeaderboardHead = document.getElementById('tableLeaderboardHead');
const uiTableLeaderboardBody = document.getElementById('tableLeaderboardBody');

// Ganesha Devotee Card Modal Elements
const uiBtnOpenDevoteeCard = document.getElementById('btnOpenDevoteeCard');
const uiDevoteeCardModal = document.getElementById('devoteeCardModal');
const uiDevoteeCardCanvas = document.getElementById('devoteeCardCanvas');
const uiBtnDownloadCardPng = document.getElementById('btnDownloadCardPng');
const uiBtnCloseDevoteeCard = document.getElementById('btnCloseDevoteeCard');
const uiBtnCloseCardBottom = document.getElementById('btnCloseCardBottom');
const uiCardModalSubtitle = document.getElementById('cardModalSubtitle');
const uiCardLangButtonGroup = document.getElementById('cardLangButtonGroup');
const uiBtnCardLangEn = document.getElementById('btnCardLangEn');
const uiBtnCardLangTa = document.getElementById('btnCardLangTa');
const uiBtnCardLangTe = document.getElementById('btnCardLangTe');
const uiBtnCardLangHi = document.getElementById('btnCardLangHi');
const uiBtnCardLangKn = document.getElementById('btnCardLangKn');
const uiBtnCardLangMr = document.getElementById('btnCardLangMr');
let cardLanguage = 'en'; // 'en' | 'ta' | 'te' | 'hi' | 'kn' | 'mr'
let userManuallyChangedLang = false;
// Optional sync-status line on the game-over screen (may not exist in DOM).
const uiGoSyncStatusText = document.getElementById('goSyncStatusText');

// Escape user-controlled strings before injecting into innerHTML templates.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Non-blocking form error: red ring + shake + focus (no window.alert).
function showRegError(inputEl, message) {
  try {
    if (window.__vighnahartaToastTimer) clearTimeout(window.__vighnahartaToastTimer);
    let toast = document.getElementById('regErrorToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'regErrorToast';
      toast.setAttribute('role', 'alert');
      toast.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);'
        + 'background:rgba(120,10,10,.95);color:#FFF8E1;border:1px solid #FFD700;border-radius:10px;'
        + 'padding:10px 16px;font:700 .85rem Outfit,sans-serif;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.6);'
        + 'max-width:min(92vw,420px);text-align:center;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    window.__vighnahartaToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3200);
    if (inputEl) {
      inputEl.focus();
      const prev = inputEl.style.boxShadow;
      inputEl.style.boxShadow = '0 0 0 2px #C62828, 0 0 12px rgba(198,40,40,.7)';
      inputEl.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
         { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 280 }
      );
      setTimeout(() => { inputEl.style.boxShadow = prev; }, 1800);
    }
  } catch (e) { /* never break registration on toast failure */ }
}

// Mushika Companion & Dialogue DOM Elements (Voice audio disabled per user request)
const uiMushikaCompanion = document.getElementById('mushikaCompanion');
const uiMushikaText = document.getElementById('mushikaText');
const uiBtnMinimizeMushika = document.getElementById('btnMinimizeMushika');
let voiceNarrationEnabled = false; // Spoken voice audio disabled per user instruction
let currentVoiceAudio = null;
let voiceTypewriterTimer = null;

if (uiTitleBestScore) {
  uiTitleBestScore.textContent = bestScore.toLocaleString();
}

// --- Devotee & NIAT Campus Database Management ---
let currentDevotee = {
  name: localStorage.getItem('vighnaharta_player_name') || '',
  campus: localStorage.getItem('vighnaharta_player_campus') || '',
  studentId: localStorage.getItem('vighnaharta_player_id') || ''
};

function updateDevoteeUI() {
  const hasProfile = Boolean(currentDevotee.name && currentDevotee.campus);
  if (uiTitleDevoteeName) {
    uiTitleDevoteeName.textContent = hasProfile ? currentDevotee.name : 'Tap to Register';
  }
  if (uiTitleDevoteeCampus) {
    uiTitleDevoteeCampus.textContent = hasProfile ? currentDevotee.campus : 'Select your NIAT Campus';
  }
  if (uiHudPlayerName) {
    uiHudPlayerName.textContent = currentDevotee.name || 'Devotee';
  }
  if (uiHudPlayerCampus) {
    const shortCampus = currentDevotee.campus.replace(/^NIAT\s*-\s*/, '') || 'NIAT';
    uiHudPlayerCampus.textContent = shortCampus;
  }
}

function openRegistrationModal(allowCancel = true) {
  if (!uiRegistrationModal) return;
  if (uiInputDevoteeName) uiInputDevoteeName.value = currentDevotee.name || '';
  if (uiSelectNiatCampus) uiSelectNiatCampus.value = currentDevotee.campus || '';
  if (uiInputStudentId) uiInputStudentId.value = currentDevotee.studentId || '';
  if (uiBtnCancelRegistration) {
    uiBtnCancelRegistration.style.display = (allowCancel && currentDevotee.name && currentDevotee.campus) ? 'inline-block' : 'none';
  }
  uiRegistrationModal.style.display = 'flex';
  if (uiInputDevoteeName) {
    setTimeout(() => uiInputDevoteeName.focus(), 100);
  }
}

function closeRegistrationModal() {
  if (uiRegistrationModal) uiRegistrationModal.style.display = 'none';
}

function saveDevoteeProfile() {
  const name = (uiInputDevoteeName ? uiInputDevoteeName.value : '').trim();
  const campus = (uiSelectNiatCampus ? uiSelectNiatCampus.value : '').trim();
  const studentId = (uiInputStudentId ? uiInputStudentId.value : '').trim();

  if (!name) {
    showRegError(uiInputDevoteeName, 'Please enter your Devotee Name / कृपया अपना नाम दर्ज करें।');
    return false;
  }
  if (!campus) {
    showRegError(uiSelectNiatCampus, 'Please choose your NIAT Campus / कृपया अपना NIAT कैंपस चुनें।');
    return false;
  }

  currentDevotee = { name: name.slice(0, 45), campus, studentId: studentId.slice(0, 30) };
  localStorage.setItem('vighnaharta_player_name', name);
  localStorage.setItem('vighnaharta_player_campus', campus);
  localStorage.setItem('vighnaharta_player_id', studentId);

  // Auto-detect and set card language based on chosen campus state
  cardLanguage = getLanguageForCampus(campus);
  userManuallyChangedLang = false;

  updateDevoteeUI();
  closeRegistrationModal();
  return true;
}

// Database record submission (Excel file & browser cache)
async function recordScoreToDatabase(scoreVal, waveVal, clearedVal, comboVal, blessingsVal) {
  const clampNum = (v, lo, hi, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, Math.floor(n)));
  };
  const payload = {
    name: String(currentDevotee.name || 'Anonymous Devotee').slice(0, 45),
    campus: String(currentDevotee.campus || 'NIAT - General').slice(0, 120),
    studentId: String(currentDevotee.studentId || '').slice(0, 30),
    score: clampNum(scoreVal, 0, 10000000, 0),
    wave: clampNum(waveVal, 1, 999, 1),
    cleared: clampNum(clearedVal, 0, 100000, 0),
    combo: clampNum(comboVal, 1, 999, 1),
    blessings: clampNum(blessingsVal, 0, 99, 0)
  };

  // 1. Save to browser persistent database
  try {
    const rawDb = localStorage.getItem('vighnaharta_offline_db');
    const localDb = rawDb ? JSON.parse(rawDb) : [];
    const dateStr = new Date().toLocaleString();
    localDb.unshift({
      sessionId: `VGH-${Date.now().toString().slice(-6)}`,
      timestamp: dateStr,
      ...payload
    });
    localStorage.setItem('vighnaharta_offline_db', JSON.stringify(localDb.slice(0, 100)));
  } catch(e) {
    console.warn('LocalStorage DB error:', e);
  }

  // 2. Post to backend server to append to vighnaharta_scores.xlsx
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (uiGoSyncStatusText) {
        uiGoSyncStatusText.textContent = `✓ Recorded to Excel Database (${data.sessionId || 'vighnaharta_scores.xlsx'})`;
      }
      return;
    }
  } catch (err) {
    console.log('Server sync offline, preserved in local browser database:', err);
  }

  if (uiGoSyncStatusText) {
    uiGoSyncStatusText.textContent = '✓ Saved to Excel Database (Local)';
  }
}

// --- Leaderboard & Excel Modal Logic ---
let currentLeaderboardTab = 'campuses';
let cachedScoresData = null;

async function fetchScoresData() {
  try {
    const res = await fetch('/api/scores');
    if (res.ok) {
      cachedScoresData = await res.json();
      return cachedScoresData;
    }
  } catch (err) {
    console.log('Fetching scores from server failed, using local records');
  }

  // Fallback: build from localStorage
  const rawDb = localStorage.getItem('vighnaharta_offline_db');
  const sessions = rawDb ? JSON.parse(rawDb) : [];
  
  const campusMap = {};
  sessions.forEach(s => {
    if (!campusMap[s.campus]) {
      campusMap[s.campus] = { campus: s.campus, totalDevotees: new Set(), totalScore: 0, highestScore: 0, topDevotee: s.name };
    }
    campusMap[s.campus].totalDevotees.add(s.name);
    campusMap[s.campus].totalScore += s.score;
    if (s.score > campusMap[s.campus].highestScore) {
      campusMap[s.campus].highestScore = s.score;
      campusMap[s.campus].topDevotee = s.name;
    }
  });

  const campuses = Object.values(campusMap).map((c, idx) => ({
    rank: idx + 1,
    campus: c.campus,
    totalDevotees: c.totalDevotees.size,
    totalScore: c.totalScore,
    highestScore: c.highestScore,
    topDevotee: c.topDevotee
  })).sort((a, b) => b.totalScore - a.totalScore);

  campuses.forEach((c, idx) => c.rank = idx + 1);

  cachedScoresData = { sessions, campuses };
  return cachedScoresData;
}

function renderLeaderboardTable() {
  if (!uiTableLeaderboardHead || !uiTableLeaderboardBody) return;
  const data = cachedScoresData || { campuses: [], sessions: [] };

  if (currentLeaderboardTab === 'campuses') {
    uiTableLeaderboardHead.innerHTML = `
      <tr>
        <th style="width: 55px; text-align: center;">RANK</th>
        <th>NIAT CAMPUS</th>
        <th style="text-align: center;">DEVOTEES</th>
        <th style="text-align: right;">TOTAL PUNYA</th>
        <th style="text-align: right;">BEST SCORE</th>
        <th>TOP DEVOTEE</th>
      </tr>
    `;

    if (!data.campuses || data.campuses.length === 0) {
      uiTableLeaderboardBody.innerHTML = `
        <tr><td colspan="6" style="text-align:center; padding: 28px; color: var(--brass-mid);">
          No campus scores recorded yet. Play a game to record the first offering in the Excel database!
        </td></tr>
      `;
      return;
    }

    uiTableLeaderboardBody.innerHTML = data.campuses.map(c => {
      const rankCls = c.rank === 1 ? 'rank-1' : (c.rank === 2 ? 'rank-2' : (c.rank === 3 ? 'rank-3' : 'rank-other'));
      return `
        <tr>
          <td style="text-align: center;"><span class="rank-badge ${rankCls}">${c.rank}</span></td>
          <td><strong style="color: var(--gold);">${escapeHtml(c.campus)}</strong></td>
          <td style="text-align: center;">${Number(c.totalDevotees).toLocaleString()}</td>
          <td style="text-align: right;" class="score-text-gold">${Number(c.totalScore).toLocaleString()}</td>
          <td style="text-align: right;">${Number(c.highestScore).toLocaleString()}</td>
          <td>${escapeHtml(c.topDevotee) || 'N/A'}</td>
        </tr>
      `;
    }).join('');

  } else {
    // Sessions Log tab
    uiTableLeaderboardHead.innerHTML = `
      <tr>
        <th>TIMESTAMP</th>
        <th>DEVOTEE</th>
        <th>NIAT CAMPUS</th>
        <th style="text-align: right;">SCORE</th>
        <th style="text-align: center;">WAVE</th>
        <th style="text-align: center;">CLEARED</th>
        <th style="text-align: center;">STATUS</th>
      </tr>
    `;

    if (!data.sessions || data.sessions.length === 0) {
      uiTableLeaderboardBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding: 28px; color: var(--brass-mid);">
          No session history recorded yet.
        </td></tr>
      `;
      return;
    }

    uiTableLeaderboardBody.innerHTML = data.sessions.slice(0, 30).map(s => `
      <tr>
        <td style="font-size: 0.75rem; color: #B0BEC5;">${escapeHtml(s.timestamp)}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td style="font-size: 0.8rem; color: #FFE082;">${escapeHtml(s.campus)}</td>
        <td style="text-align: right;" class="score-text-gold">${Number(s.score).toLocaleString()}</td>
        <td style="text-align: center;">Wave ${Number(s.wave) || 1}</td>
        <td style="text-align: center;">${Number(s.cleared) || 0}</td>
        <td style="text-align: center; font-size: 0.75rem; color: #81C784;">${escapeHtml(s.status) || 'Completed'}</td>
      </tr>
    `).join('');
  }
}

async function openLeaderboardModal(tab = 'campuses') {
  currentLeaderboardTab = tab;
  if (uiTabBtnCampuses) uiTabBtnCampuses.classList.toggle('is-active', tab === 'campuses');
  if (uiTabBtnSessions) uiTabBtnSessions.classList.toggle('is-active', tab === 'sessions');
  if (uiLeaderboardModal) uiLeaderboardModal.style.display = 'flex';
  await fetchScoresData();
  renderLeaderboardTable();
}

function closeLeaderboardModal() {
  if (uiLeaderboardModal) uiLeaderboardModal.style.display = 'none';
}

// ============================================================
// Multilingual Ganesha Devotee Card System
// Supports: English, Tamil, Telugu, Hindi, Kannada, Marathi
// ============================================================

const CARD_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    fontTitle: '900 27px "Cinzel Decorative", "Outfit", serif',
    fontBody: '"Outfit", sans-serif',
    fontVerse: 'italic 16px "Tiro Devanagari Hindi", serif',
    modalSub: 'Personalized Sacred Blessing Certificate',
    invocation: '॥ श्री गणेशाय नमः ॥',
    title: 'GANESHA DEVOTEE CARD',
    subtitle: 'VIGHNAHARTA MAHOTSAV • 2026',
    devoteeLabel: 'Presented with sacred blessings to:',
    verse1: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।',
    verse2: 'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
    blessing1: 'May Lord Vighnaharta dissolve all obstacles and bestow',
    blessing2: 'divine wisdom, prosperity, and success in all your journeys.',
    punyaLabel: 'SACRED PUNYA',
    tithi: 'भाद्रपद शुक्ल चतुर्थी महोत्सव',
    dateLocale: 'en-IN',
    datePrefix: 'Dated: ',
    seal1: '★ VIGHNAHARTA ★',
    seal2: 'TEMPLE SEAL'
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    fontTitle: 'bold 28px "Mukta Malar", sans-serif',
    fontBody: '"Mukta Malar", sans-serif',
    fontVerse: 'bold 16px "Mukta Malar", sans-serif',
    modalSub: 'தனிப்பயனாக்கப்பட்ட விநாயகர் அருளாசி அட்டை',
    invocation: '॥ ஓம் ஸ்ரீ கணேசாய நமஹ ॥',
    title: 'விநாயகர் அருளாசி அட்டை',
    subtitle: 'விக்னஹர்த்தா பெருவிழா • 2026',
    devoteeLabel: 'அருள் பெரும் பக்தர்:',
    verse1: 'ஐந்து கரத்தனை ஆனை முகத்தனை',
    verse2: 'இந்தின் இளம்பிறை போலும் எயிற்றனை ॥',
    blessing1: 'முழுமுதற் கடவுள் விநாயகர் உங்கள் வாழ்வில் உள்ள தடைகளை நீக்கி,',
    blessing2: 'நல்வாழ்வும், கல்வி ஞானமும், வெற்றியும் தந்தருள்வாராக.',
    punyaLabel: 'புண்ணியம்',
    tithi: 'விநாயகர் சதுர்த்தி நன்னாள்',
    dateLocale: 'ta-IN',
    datePrefix: 'தேதி: ',
    seal1: '★ விக்னஹர்த்தா ★',
    seal2: 'கோயில் முத்திரை'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    fontTitle: 'bold 27px "Noto Sans Telugu", sans-serif',
    fontBody: '"Noto Sans Telugu", sans-serif',
    fontVerse: 'bold 15.5px "Noto Sans Telugu", sans-serif',
    modalSub: 'వ్యక్తిగతీకరించిన గణేశ భక్త ఆశీర్వాద పత్రం',
    invocation: '॥ ఓం శ్రీ గణేశాయ నమః ॥',
    title: 'గణేశ భక్త ఆశీర్వాద పత్రం',
    subtitle: 'విఘ్నహర్త మహోత్సవం • 2026',
    devoteeLabel: 'పరమ భక్తుడు:',
    verse1: 'శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజమ్ ।',
    verse2: 'ప్రసన్నవదనం ధ్యాయేత్ సర్వవిఘ్నోపశాంతయే ॥',
    blessing1: 'శ్రీ విఘ్నహర్త విఘ్నాలన్నీ తొలగించి మీకు విద్యాబుద్ధులు,',
    blessing2: 'శాంతి సౌఖ్యాలు, సకల విజయాలు ప్రసాదించుగాక.',
    punyaLabel: 'పుణ్య ఫలం',
    tithi: 'వినాయక చవితి పర్వదినం',
    dateLocale: 'te-IN',
    datePrefix: 'తేదీ: ',
    seal1: '★ విఘ్నహర్త ★',
    seal2: 'ఆలయ ముద్ర'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    fontTitle: 'bold 28px "Noto Sans Devanagari", "Tiro Devanagari Hindi", serif',
    fontBody: '"Noto Sans Devanagari", sans-serif',
    fontVerse: 'bold 16px "Tiro Devanagari Hindi", serif',
    modalSub: 'व्यक्तिगत श्री गणेश भक्त आशीर्वाद पत्र',
    invocation: '॥ ॐ श्री गणेशाय नमः ॥',
    title: 'गणेश भक्त आशीर्वाद पत्र',
    subtitle: 'विघ्नहर्ता गणेशोत्सव • 2026',
    devoteeLabel: 'आशीर्वाद प्राप्तकर्ता:',
    verse1: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।',
    verse2: 'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
    blessing1: 'भगवान विघ्नहर्ता आपके जीवन के सभी विघ्नों को दूर करें,',
    blessing2: 'और सुख, समृद्धि, ज्ञान तथा विजय का वरदान दें।',
    punyaLabel: 'पुण्य फल',
    tithi: 'भाद्रपद शुक्ल चतुर्थी महोत्सव',
    dateLocale: 'hi-IN',
    datePrefix: 'दिनांक: ',
    seal1: '★ विघ्नहर्ता ★',
    seal2: 'मंदिर मुद्रा'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    fontTitle: 'bold 27px "Noto Sans Kannada", sans-serif',
    fontBody: '"Noto Sans Kannada", sans-serif',
    fontVerse: 'bold 15.5px "Noto Sans Kannada", sans-serif',
    modalSub: 'ವೈಯಕ್ತಿಕ ಗಣೇಶ ಭಕ್ತ ಆಶೀರ್ವಾದ ಪತ್ರ',
    invocation: '॥ ಓಂ ಶ್ರೀ ಗಣೇಶಾಯ ನಮಃ ॥',
    title: 'ಗಣೇಶ ಭಕ್ತ ಆಶೀರ್ವಾದ ಪತ್ರ',
    subtitle: 'ವಿಘ್ನಹರ್ತ ಮಹೋತ್ಸವ • 2026',
    devoteeLabel: 'ಅನುಗ್ರಹ ಪಾತ್ರ ಭಕ್ತರು:',
    verse1: 'ವಕ್ರತುಂಡ ಮಹಾಕಾಯ ಸೂರ್ಯಕೋಟಿ ಸಮಪ್ರಭ ।',
    verse2: 'ನಿರ್ವಿಘ್ನಂ ಕುರು ಮೇ ದೇವ ಸರ್ವಕಾರ್ಯೇಷು ಸರ್ವದಾ ॥',
    blessing1: 'ಶ್ರೀ ವಿಘ್ನಹರ್ತನು ನಿಮ್ಮ ಸಕಲ ವಿಘ್ನಗಳನ್ನು ನಿವಾರಿಸಿ,',
    blessing2: 'ಜ್ಞಾನ, ಶಾಂತಿ, ಸಮೃದ್ಧಿ ಹಾಗೂ ಯಶಸ್ಸನ್ನು ಕರುಣಿಸಲಿ.',
    punyaLabel: 'ಪುಣ್ಯ ಫಲ',
    tithi: 'ಗಣೇಶ ಚತುರ್ಥಿ ಮಹೋತ್ಸವ',
    dateLocale: 'kn-IN',
    datePrefix: 'ದಿನಾಂಕ: ',
    seal1: '★ ವಿಘ್ನಹರ್ತ ★',
    seal2: 'ದೇವಾಲಯ ಮುದ್ರೆ'
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    fontTitle: 'bold 28px "Noto Sans Devanagari", serif',
    fontBody: '"Noto Sans Devanagari", sans-serif',
    fontVerse: 'bold 16px "Tiro Devanagari Hindi", serif',
    modalSub: 'व्यक्तिगत श्री गणेश भक्त आशीर्वाद पत्र',
    invocation: '॥ ॐ गं गणपतये नमः ॥',
    title: 'गणेश भक्त आशीर्वाद पत्र',
    subtitle: 'श्री विघ्नहर्ता गणेशोत्सव • २०२६',
    devoteeLabel: 'आशीर्वाद प्राप्तकर्ता भक्त:',
    verse1: 'सुखकर्ता दुःखहर्ता वार्ता विघ्नाची ।',
    verse2: 'नुरवी पुरवी प्रेम कृपा जयाची ॥',
    blessing1: 'श्री विघ्नहर्ता आपल्या आयुष्यातील सर्व संकटांचे निवारण करो,',
    blessing2: 'आणि सुख, समृद्धी, आरोग्य व उत्तम यश प्रदान करो.',
    punyaLabel: 'पुण्य संचय',
    tithi: 'भाद्रपद शुक्ल चतुर्थी महोत्सव',
    dateLocale: 'mr-IN',
    datePrefix: 'दिनांक: ',
    seal1: '★ विघ्नहर्ता ★',
    seal2: 'मंदिर मुद्रा'
  }
};

// Automatic State-to-Language Detection
function getLanguageForCampus(campus) {
  if (!campus) return 'en';
  const c = campus.toLowerCase();
  // Tamil Nadu & Pondicherry
  if (c.includes('chennai') || c.includes('pondicherry') || c.includes('tirunelveli') || c.includes('tamil') || 
      c.includes('takshashila') || c.includes('amet') || c.includes('crescent') || c.includes('joy')) {
    return 'ta';
  }
  // Telangana & Andhra Pradesh
  if (c.includes('hyderabad') || c.includes('telangana') || c.includes('guntur') || 
      c.includes('vijayawada') || c.includes('visakhapatnam') || c.includes('anantapur') || 
      c.includes('kadapa') || c.includes('andhra') || c.includes('malla reddy') || c.includes('aurora') ||
      c.includes('chaitanya') || c.includes('kapil') || c.includes('chalapathi') || c.includes('lingaya') ||
      c.includes('nri') || c.includes('nsrit') || c.includes('best') || c.includes('annamacharya')) {
    return 'te';
  }
  // Karnataka
  if (c.includes('bengaluru') || c.includes('bangalore') || c.includes('mangalore') || c.includes('karnataka') || 
      c.includes('vyasa') || c.includes('peter') || c.includes('yenepoya')) {
    return 'kn';
  }
  // Maharashtra
  if (c.includes('pune') || c.includes('kolhapur') || c.includes('maharashtra') || c.includes('patil') || c.includes('ghodawat')) {
    return 'mr';
  }
  // North & Central India
  if (c.includes('noida') || c.includes('mathura') || c.includes('jaipur') || c.includes('bhopal') || 
      c.includes('sanskriti') || c.includes('vgu') || c.includes('tagore') || c.includes('north')) {
    return 'hi';
  }
  return 'en';
}

function updateCardLangButtons() {
  const langKeys = ['en', 'ta', 'te', 'hi', 'kn', 'mr'];
  langKeys.forEach(k => {
    const btn = document.getElementById(`btnCardLang${k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (btn) {
      btn.classList.toggle('is-active', cardLanguage === k);
    }
  });

  const cfg = CARD_LANGUAGES[cardLanguage] || CARD_LANGUAGES.en;
  if (uiCardModalSubtitle) {
    uiCardModalSubtitle.textContent = cfg.modalSub;
  }
}

// Canvas Text Auto-Fit Helper: Guarantees zero text collision by scaling font size if needed
function drawFittedText(ctx2, text, x, y, maxW, baseFont, color, align = 'center') {
  ctx2.save();
  ctx2.textAlign = align;
  ctx2.fillStyle = color;
  ctx2.font = baseFont;
  let w = ctx2.measureText(text).width;
  if (w > maxW && maxW > 0) {
    const match = baseFont.match(/(\d+(?:\.\d+)?)px/);
    if (match) {
      const origSize = parseFloat(match[1]);
      const newSize = Math.max(11, Math.floor(origSize * (maxW / w)));
      ctx2.font = baseFont.replace(match[0], `${newSize}px`);
    }
  }
  ctx2.fillText(text, x, y);
  ctx2.restore();
}

// --- Sacred Ganesha Devotee Blessing Card Renderer ---
function renderDevoteeCard() {
  if (!uiDevoteeCardCanvas) return;
  const c = uiDevoteeCardCanvas;
  const ctx2 = c.getContext('2d');
  const w = c.width = 960;
  const h = c.height = 580;

  const cfg = CARD_LANGUAGES[cardLanguage] || CARD_LANGUAGES.en;

  // 1. Devotional Midnight Indigo / Purple Radial Gradient Background
  const bgGrad = ctx2.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 540);
  bgGrad.addColorStop(0, '#2D0A4E');
  bgGrad.addColorStop(0.5, '#1B0530');
  bgGrad.addColorStop(1, '#0C0116');
  ctx2.fillStyle = bgGrad;
  ctx2.fillRect(0, 0, w, h);

  // Subtle Temple Watermark (Sacred 12-fold Lotus Ring behind Deity)
  ctx2.save();
  ctx2.translate(175, 280);
  ctx2.strokeStyle = 'rgba(255, 215, 0, 0.05)';
  ctx2.lineWidth = 1.5;
  for (let m = 0; m < 12; m++) {
    ctx2.rotate((Math.PI * 2) / 12);
    ctx2.beginPath();
    ctx2.arc(0, 70, 60, 0, Math.PI * 2);
    ctx2.stroke();
  }
  ctx2.restore();

  // Subtle Golden Star Dust Accents
  ctx2.fillStyle = 'rgba(255, 215, 0, 0.35)';
  const starDots = [
    [70, 60], [250, 45], [480, 40], [740, 55], [890, 80],
    [65, 520], [380, 535], [860, 515], [920, 290], [45, 290]
  ];
  for (const [sx, sy] of starDots) {
    ctx2.fillRect(sx, sy, 2.5, 2.5);
  }

  // 2. Clean Dignified Golden Double Border & Corner Bosses
  ctx2.strokeStyle = '#D4AF37';
  ctx2.lineWidth = 3.5;
  ctx2.strokeRect(18, 18, w - 36, h - 36);

  ctx2.strokeStyle = 'rgba(255, 215, 0, 0.55)';
  ctx2.lineWidth = 1.2;
  ctx2.strokeRect(25, 25, w - 50, h - 50);

  // 4 Corner Medallion Bosses
  const corners = [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]];
  for (const [cx2, cy2] of corners) {
    ctx2.strokeStyle = '#FFD700';
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    ctx2.arc(cx2, cy2, 12, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.fillStyle = '#C62828';
    ctx2.beginPath();
    ctx2.arc(cx2, cy2, 4, 0, Math.PI * 2);
    ctx2.fill();
  }

  // Top Marigold Torana Flower Garland
  const flowerCount = 26;
  const flowerStep = (w - 70) / flowerCount;
  for (let f = 0; f <= flowerCount; f++) {
    const fx = 35 + f * flowerStep;
    ctx2.fillStyle = f % 2 === 0 ? '#FFC107' : '#FF6B00';
    ctx2.beginPath();
    ctx2.arc(fx, 25, 4.5, 0, Math.PI * 2);
    ctx2.fill();
  }

  // 3. Left Side: Sacred Deity Portrait & Medallion (Guaranteed clear buffer space)
  const medX = 175;
  const medY = 280;
  const medR = 98;

  // Divine Golden Aura Glow
  const haloGrad = ctx2.createRadialGradient(medX, medY, medR * 0.7, medX, medY, medR * 1.4);
  haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.38)');
  haloGrad.addColorStop(0.6, 'rgba(255, 107, 0, 0.12)');
  haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx2.fillStyle = haloGrad;
  ctx2.beginPath();
  ctx2.arc(medX, medY, medR * 1.4, 0, Math.PI * 2);
  ctx2.fill();

  // Brass & Gold Medallion Rim
  ctx2.strokeStyle = '#D4AF37';
  ctx2.lineWidth = 4.5;
  ctx2.beginPath();
  ctx2.arc(medX, medY, medR, 0, Math.PI * 2);
  ctx2.stroke();

  ctx2.strokeStyle = '#FFE082';
  ctx2.lineWidth = 1.2;
  ctx2.beginPath();
  ctx2.arc(medX, medY, medR - 4, 0, Math.PI * 2);
  ctx2.stroke();

  // Golden Sacred Dots around Medallion
  ctx2.fillStyle = '#FFD700';
  for (let d = 0; d < 18; d++) {
    const a = (d / 18) * Math.PI * 2;
    ctx2.beginPath();
    ctx2.arc(medX + Math.cos(a) * (medR - 8), medY + Math.sin(a) * (medR - 8), 2.2, 0, Math.PI * 2);
    ctx2.fill();
  }

  // Draw Ganesha Sacred Portrait Inside Medallion
  ctx2.save();
  ctx2.beginPath();
  ctx2.arc(medX, medY, medR - 12, 0, Math.PI * 2);
  ctx2.clip();
  if (ganeshaImg && ganeshaImg.complete && ganeshaImg.naturalWidth > 0) {
    const imgSize = (medR - 12) * 2;
    ctx2.drawImage(ganeshaImg, medX - imgSize / 2, medY - imgSize / 2, imgSize, imgSize);
  } else {
    ctx2.fillStyle = '#FFD700';
    ctx2.font = 'bold 68px "Tiro Devanagari Hindi", serif';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText('ॐ', medX, medY);
  }
  // Soft warm tint overlay
  ctx2.fillStyle = 'rgba(255, 215, 0, 0.08)';
  ctx2.fillRect(medX - medR, medY - medR, medR * 2, medR * 2);
  ctx2.restore();

  // Lotus Base under Medallion
  ctx2.fillStyle = '#FFC107';
  ctx2.beginPath();
  ctx2.ellipse(medX, medY + medR + 5, 38, 8, 0, 0, Math.PI * 2);
  ctx2.fill();

  // 4. Right Side: Clear, Dignified Devotee Certificate Details (Centered at 635)
  // Distance from medX (175 + 98 = 273) to text left boundary (385) is 112px of safety!
  const contentX = 635;

  // --- Zone A: Sacred Header ---
  drawFittedText(ctx2, cfg.invocation, contentX, 70, 500, 'bold 20px ' + cfg.fontBody, '#FFB300');

  // Main Card Title with Glow
  ctx2.save();
  ctx2.shadowColor = 'rgba(255, 215, 0, 0.35)';
  ctx2.shadowBlur = 8;
  drawFittedText(ctx2, cfg.title, contentX, 108, 520, cfg.fontTitle, '#FFD700');
  ctx2.restore();

  drawFittedText(ctx2, cfg.subtitle, contentX, 135, 480, '600 12.5px ' + cfg.fontBody, '#FFE082');

  // Golden Divider Line with Central Sacred ॐ
  ctx2.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.moveTo(contentX - 190, 153);
  ctx2.lineTo(contentX - 25, 153);
  ctx2.moveTo(contentX + 25, 153);
  ctx2.lineTo(contentX + 190, 153);
  ctx2.stroke();
  ctx2.fillStyle = '#FFD700';
  ctx2.font = '16px "Tiro Devanagari Hindi", serif';
  ctx2.textAlign = 'center';
  ctx2.fillText('ॐ', contentX, 158);

  // --- Zone B: Devotee Information ---
  drawFittedText(ctx2, cfg.devoteeLabel, contentX, 188, 480, 'italic 13.5px ' + cfg.fontBody, 'rgba(255, 248, 225, 0.85)');

  const devoteeName = (currentDevotee.name || (cfg.code === 'ta' ? 'அன்பர்' : (cfg.code === 'te' ? 'భక్తుడు' : 'Sacred Devotee'))).toUpperCase();
  ctx2.save();
  ctx2.shadowColor = '#000000';
  ctx2.shadowBlur = 6;
  drawFittedText(ctx2, devoteeName, contentX, 230, 480, '900 30px "Outfit", ' + cfg.fontBody, '#FFE57F');
  ctx2.restore();

  // Dynamic Accent Underline sized precisely to the devotee's name
  ctx2.font = '900 30px "Outfit", ' + cfg.fontBody;
  const nameW = Math.min(460, ctx2.measureText(devoteeName).width);
  const lineW = Math.max(100, Math.min(340, nameW + 24));
  ctx2.fillStyle = '#C62828';
  ctx2.fillRect(contentX - lineW / 2, 242, lineW, 2.5);
  ctx2.fillStyle = '#FFD700';
  ctx2.fillRect(contentX - 22, 241, 44, 4.5);

  // Campus Badge Pill
  const rawCampus = currentDevotee.campus || 'NIAT - Partner Campus';
  const campusText = rawCampus;
  ctx2.font = 'bold 13px "Outfit", ' + cfg.fontBody;
  const campusW = ctx2.measureText(campusText).width;
  const campusBadgeW = Math.min(480, Math.max(220, campusW + 36));
  const campusBadgeH = 30;
  const badgeX = contentX - campusBadgeW / 2;
  const badgeY = 256;

  ctx2.fillStyle = 'rgba(255, 107, 0, 0.2)';
  ctx2.strokeStyle = '#D4AF37';
  ctx2.lineWidth = 1.2;
  ctx2.beginPath();
  ctx2.roundRect(badgeX, badgeY, campusBadgeW, campusBadgeH, 6);
  ctx2.fill();
  ctx2.stroke();

  drawFittedText(ctx2, campusText, contentX, badgeY + 20, campusBadgeW - 16, 'bold 13px "Outfit", ' + cfg.fontBody, '#FFE082');

  // --- Zone C: Sacred Verse & Blessing (Clean 2+2 lines, Auto-Fitted) ---
  drawFittedText(ctx2, cfg.verse1, contentX, 330, 500, cfg.fontVerse, '#FFD700');
  drawFittedText(ctx2, cfg.verse2, contentX, 354, 500, cfg.fontVerse, '#FFD700');

  drawFittedText(ctx2, cfg.blessing1, contentX, 396, 520, '13px ' + cfg.fontBody, 'rgba(255, 248, 225, 0.9)');
  drawFittedText(ctx2, cfg.blessing2, contentX, 418, 520, '13px ' + cfg.fontBody, 'rgba(255, 248, 225, 0.9)');

  // --- Zone D: Footer Row (Punya Score, Date, Temple Seal) ---
  const footerY = 485;
  const displayScore = Math.max(score, bestScore);

  // 1. Punya Badge Box (Left)
  ctx2.fillStyle = 'rgba(212, 175, 55, 0.16)';
  ctx2.strokeStyle = '#D4AF37';
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.roundRect(365, footerY - 18, 130, 42, 6);
  ctx2.fill();
  ctx2.stroke();

  drawFittedText(ctx2, cfg.punyaLabel, 430, footerY - 2, 115, 'bold 10.5px ' + cfg.fontBody, '#FFC107');
  drawFittedText(ctx2, displayScore.toLocaleString(), 430, footerY + 16, 115, 'bold 16px "Outfit", sans-serif', '#FFFFFF');

  // 2. Date & Tithi (Center)
  const today = new Date();
  const dateStr = today.toLocaleDateString(cfg.dateLocale || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  drawFittedText(ctx2, cfg.datePrefix + dateStr, 635, footerY - 2, 220, '11.5px ' + cfg.fontBody, '#B0BEC5');
  drawFittedText(ctx2, cfg.tithi, 635, footerY + 15, 240, 'italic 11.5px ' + cfg.fontBody, '#FFE082');

  // 3. Circular Temple Seal (Right)
  const sealX = 840;
  const sealY = footerY;
  const sealR = 28;

  ctx2.save();
  ctx2.translate(sealX, sealY);
  ctx2.strokeStyle = '#D4AF37';
  ctx2.lineWidth = 1.8;
  ctx2.beginPath();
  ctx2.arc(0, 0, sealR, 0, Math.PI * 2);
  ctx2.stroke();

  ctx2.strokeStyle = '#FFD700';
  ctx2.lineWidth = 0.9;
  ctx2.beginPath();
  ctx2.arc(0, 0, sealR - 3.5, 0, Math.PI * 2);
  ctx2.stroke();

  ctx2.fillStyle = '#FFD700';
  ctx2.font = 'bold 15px "Tiro Devanagari Hindi", serif';
  ctx2.textAlign = 'center';
  ctx2.fillText('ॐ', 0, 5);

  drawFittedText(ctx2, cfg.seal1, 0, -sealR + 9, sealR * 2, 'bold 6.5px ' + cfg.fontBody, '#FFE082');
  drawFittedText(ctx2, cfg.seal2, 0, sealR - 7, sealR * 2, 'bold 6.5px ' + cfg.fontBody, '#FFE082');
  ctx2.restore();
}

function openDevoteeCardModal() {
  if (!currentDevotee.name || !currentDevotee.campus) {
    openRegistrationModal(true);
    return;
  }
  // Auto-detect language from student's campus state if user hasn't manually selected one
  if (!userManuallyChangedLang) {
    cardLanguage = getLanguageForCampus(currentDevotee.campus);
  }
  updateCardLangButtons();
  renderDevoteeCard();
  if (uiDevoteeCardModal) uiDevoteeCardModal.style.display = 'flex';
}

function closeDevoteeCardModal() {
  if (uiDevoteeCardModal) uiDevoteeCardModal.style.display = 'none';
}

function downloadDevoteeCardImage() {
  if (!uiDevoteeCardCanvas) return;
  renderDevoteeCard();
  const cfg = CARD_LANGUAGES[cardLanguage] || CARD_LANGUAGES.en;
  const safeName = (currentDevotee.name || 'Devotee').replace(/[^a-zA-Z0-9_-]/g, '_');
  const langName = cfg.name || 'English';
  const link = document.createElement('a');
  link.download = `Ganesha_Devotee_Card_${safeName}_${langName}.png`;
  link.href = uiDevoteeCardCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// 1. Traditional Shankha (Conch Shell) Ceremonial Blast
function sfxShankha() {
  if (!audioCtx || !soundEnabled) return;
  try {
    const now = audioCtx.currentTime;
    const dur = 1.6;

    // Breath & shell harmonics (fundamental + 2nd + 3rd harmonics)
    const freqs = [261.63, 392.00, 523.25]; // C4, G4, C5 shell resonance
    const gains = [0.18, 0.12, 0.08];

    // Master envelope with natural breath swell
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.24, now + 0.35); // Breathy swell
    masterGain.gain.setValueAtTime(0.24, now + 0.95);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Subtle pitch vibrato (lip tension)
    const vibOsc = audioCtx.createOscillator();
    const vibGain = audioCtx.createGain();
    vibOsc.frequency.setValueAtTime(5.5, now);
    vibGain.gain.setValueAtTime(4.0, now);
    vibOsc.connect(vibGain);
    vibOsc.start(now);
    vibOsc.stop(now + dur);

    const bq = audioCtx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.setValueAtTime(420, now);
    bq.Q.setValueAtTime(3.0, now);

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      vibGain.connect(osc.frequency);
      g.gain.setValueAtTime(gains[i], now);
      osc.connect(g);
      g.connect(bq);
      osc.start(now);
      osc.stop(now + dur);
    });

    bq.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  } catch (e) {}
}

// 2. Heavy Dholak / Mridangam Impact Beat
function sfxDholBeat(isHeavy = false) {
  if (!audioCtx || !soundEnabled) return;
  try {
    const now = audioCtx.currentTime;
    const dur = isHeavy ? 0.32 : 0.22;

    // Bass membrane oscillator (pitch drops rapidly like a struck drum skin)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const startFreq = isHeavy ? 175 : 145;
    const endFreq = isHeavy ? 38 : 46;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(isHeavy ? 0.45 : 0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Rim-slap noise transient (leather click)
    const slapLen = Math.floor(audioCtx.sampleRate * 0.035);
    const buffer = audioCtx.createBuffer(1, slapLen, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < slapLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (slapLen * 0.25));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(2.0, now);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(now);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch (e) {}
}

// 3. Stone Shatter / Obsidian Crack (for Lobhasura Golems)
function sfxStoneCrack() {
  if (!audioCtx || !soundEnabled) return;
  try {
    const now = audioCtx.currentTime;
    const dur = 0.28;

    // Low-pass filtered noise crunch
    const noiseLen = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.35));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const bq = audioCtx.createBiquadFilter();
    bq.type = 'lowpass';
    bq.frequency.setValueAtTime(650, now);
    bq.frequency.exponentialRampToValueAtTime(120, now + dur);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(bq);
    bq.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);

    // Sharp stone fracture click
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// 4. Shimmering Sitar Glissando / Raga Strum (for Prasad & Combos)
function sfxSitarStrum() {
  if (!audioCtx || !soundEnabled) return;
  try {
    const strum = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    strum.forEach((freq, idx) => {
      setTimeout(() => {
        playTempleBell(freq, 0.45, 0.16);
      }, idx * 45);
    });
  } catch (e) {}
}

// 5. Divine Aura Blast / Maha-Aarti Chime
function sfxAuraBlast() {
  if (!audioCtx || !soundEnabled) return;
  try {
    sfxShankha();
    sfxDholBeat(true);
    setTimeout(() => {
      playTempleBell(1046.50, 1.8, 0.35);
      playTempleBell(1318.51, 1.6, 0.28);
    }, 120);
  } catch (e) {}
}

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
  playTempleBell(880, 0.22, 0.14);
}

function sfxDestroy(comboLevel) {
  const noteIdx = Math.min(comboLevel, RAGA_NOTES.length - 1);
  const freq = RAGA_NOTES[noteIdx];
  playTempleBell(freq, 0.45, 0.22);
  sfxDholBeat(false);
}

function sfxCloseSave() {
  sfxDholBeat(true);
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
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch(e) {}
}

function sfxPowerup() {
  sfxSitarStrum();
}

function sfxWaveComplete() {
  sfxShankha();
  setTimeout(() => playTempleBell(783.99, 1.2, 0.25), 250);
}

function sfxGameOver() {
  playTempleBell(523.25, 0.5, 0.2);
  setTimeout(() => playTempleBell(440.00, 0.6, 0.2), 180);
  setTimeout(() => playTempleBell(329.63, 1.0, 0.25), 380);
}

// --- Mushika Companion Dialogue Controller (Spoken voice removed per user request) ---
function playVoiceNarration(audioSrc, text, speakerName = 'MOOSHAK VAHANA') {
  if (uiMushikaText) {
    typewriteMushikaText(text);
  }
  const speakerLabel = uiMushikaCompanion ? uiMushikaCompanion.querySelector('.mushika-name') : null;
  if (speakerLabel) {
    speakerLabel.textContent = `✦ ${speakerName}`;
  }

  // Ensure companion bubble is visible if previously minimized
  if (uiMushikaCompanion && uiMushikaCompanion.classList.contains('minimized')) {
    uiMushikaCompanion.classList.remove('minimized');
  }

  // Voice playback removed completely: cease any audio
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch (e) {}
    currentVoiceAudio = null;
  }

  // Subtle companion speaking animation pulse
  if (uiMushikaCompanion) {
    uiMushikaCompanion.classList.add('is-speaking');
    setTimeout(() => {
      if (uiMushikaCompanion) {
        uiMushikaCompanion.classList.remove('is-speaking');
      }
    }, 2800);
  }
}

function typewriteMushikaText(fullText) {
  if (voiceTypewriterTimer) {
    clearInterval(voiceTypewriterTimer);
    voiceTypewriterTimer = null;
  }
  if (!uiMushikaText) return;
  uiMushikaText.textContent = '';
  let i = 0;
  voiceTypewriterTimer = setInterval(() => {
    if (i < fullText.length) {
      uiMushikaText.textContent += fullText[i];
      i++;
    } else {
      clearInterval(voiceTypewriterTimer);
      voiceTypewriterTimer = null;
    }
  }, 18);
}

const MUSHIKA_DIALOGUES = {
  1: {
    audio: 'assets/audio/mushika_w1_start.mp3',
    text: 'Prabhu Ganesha! Matsarasura\'s shadow wisps are creeping toward our temple! Do not let them touch the sanctum, swing your Parashu!'
  },
  2: {
    audio: 'assets/audio/mushika_w2_taunt.mp3',
    text: 'Aha, a good warm-up, Prabhu! But look! Krodhasura\'s barbed crawlers are swarming from the flanks! Are you getting slow, or did you eat too many modaks?'
  },
  3: {
    audio: 'assets/audio/mushika_w3_taunt.mp3',
    text: 'O Lambodara! Wave three! The heavy stone golems of Lobhasura take two direct hits! Shatter them before they crush my snacks!'
  },
  4: {
    audio: 'assets/audio/mushika_w4_taunt.mp3',
    text: 'Hot, hot, hot! Analasura\'s blazing fire scythes are spinning toward us! Quick, Lord of Wisdom, banish the inferno!'
  },
  5: {
    audio: 'assets/audio/mushika_w5_taunt.mp3',
    text: 'The cosmic Sri Yantra is spinning! Halfway to victory, Prabhu! Show all the worlds why you are the true Vighnaharta!'
  },
  6: {
    audio: 'assets/audio/mushika_w6_taunt.mp3',
    text: 'Thunder and tempest! Even the heavens shake, but our sacred diyas burn bright! Don\'t let your guard down now, Ganesha!'
  },
  7: {
    audio: 'assets/audio/mushika_w7_taunt.mp3',
    text: 'The celestial gates are in sight! Only an elephant god with an unbeatable spirit can withstand this onslaught!'
  },
  8: {
    audio: 'assets/audio/mushika_w8_taunt.mp3',
    text: 'The demonic eclipse deepens! The supreme titan Mahavighna stirs in the darkness! Unleash your full divine might!'
  },
  10: {
    audio: 'assets/audio/mushika_w10_boss.mp3',
    text: 'Behold! Mahavighna has arrived! Deflect his heavy dark orbs back into his face! For Kailash and the universe!'
  }
};

function triggerMushikaVoice(waveNum) {
  const dlg = MUSHIKA_DIALOGUES[waveNum];
  if (dlg) {
    playVoiceNarration(dlg.audio, dlg.text, 'MOOSHAK VAHANA');
  }
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

// --- Distinct Multi-Realm Wave Atmospheres ---
const WAVE_REALMS = [
  // Wave 1: Dawn Temple Sanctum (Prabhat Utsav)
  {
    name: 'Dawn Sanctum',
    ambientWash: 'rgba(255, 140, 0, 0.06)',
    coreGlow1: 'rgba(255, 171, 64, 0.32)', coreGlow2: 'rgba(255, 111, 0, 0.12)',
    rayColor: 'rgba(255, 215, 0, 0.035)',
    flagstoneColor: 'rgba(255, 215, 0, 0.06)',
    kolamColor: 'rgba(255, 248, 225, 0.07)',
    accent: '#FF9800'
  },
  // Wave 2: Twilight Deepam (Sandhya Ghats)
  {
    name: 'Twilight Deepam',
    ambientWash: 'rgba(160, 20, 80, 0.09)',
    coreGlow1: 'rgba(255, 112, 67, 0.32)', coreGlow2: 'rgba(156, 39, 176, 0.14)',
    rayColor: 'rgba(255, 138, 101, 0.04)',
    flagstoneColor: 'rgba(255, 171, 64, 0.07)',
    kolamColor: 'rgba(255, 183, 77, 0.08)',
    accent: '#FF5722'
  },
  // Wave 3: Ratri Kolam (Midnight Sacred Sanctum)
  {
    name: 'Ratri Kolam',
    ambientWash: 'rgba(10, 20, 60, 0.14)',
    coreGlow1: 'rgba(68, 138, 255, 0.30)', coreGlow2: 'rgba(124, 77, 255, 0.14)',
    rayColor: 'rgba(179, 136, 255, 0.035)',
    flagstoneColor: 'rgba(64, 196, 255, 0.07)',
    kolamColor: 'rgba(0, 229, 255, 0.08)',
    accent: '#00E5FF'
  },
  // Wave 4: Agni Kund (Sacred Fire Realm)
  {
    name: 'Agni Kund',
    ambientWash: 'rgba(200, 35, 0, 0.14)',
    coreGlow1: 'rgba(255, 61, 0, 0.38)', coreGlow2: 'rgba(213, 0, 0, 0.18)',
    rayColor: 'rgba(255, 87, 34, 0.045)',
    flagstoneColor: 'rgba(255, 87, 34, 0.08)',
    kolamColor: 'rgba(255, 110, 64, 0.09)',
    accent: '#FF3D00'
  },
  // Wave 5: Brahmanda Mandala (Cosmic Nebula)
  {
    name: 'Brahmanda Mandala',
    ambientWash: 'rgba(80, 0, 130, 0.15)',
    coreGlow1: 'rgba(224, 64, 251, 0.34)', coreGlow2: 'rgba(101, 31, 255, 0.16)',
    rayColor: 'rgba(234, 128, 252, 0.04)',
    flagstoneColor: 'rgba(224, 64, 251, 0.07)',
    kolamColor: 'rgba(234, 128, 252, 0.08)',
    accent: '#E040FB'
  },
  // Wave 6: Pralaya Storm (Tempest Thunder Realm)
  {
    name: 'Pralaya Storm',
    ambientWash: 'rgba(20, 35, 65, 0.18)',
    coreGlow1: 'rgba(144, 202, 249, 0.32)', coreGlow2: 'rgba(103, 58, 183, 0.16)',
    rayColor: 'rgba(255, 255, 255, 0.04)',
    flagstoneColor: 'rgba(187, 222, 251, 0.07)',
    kolamColor: 'rgba(144, 202, 249, 0.08)',
    accent: '#90CAF9'
  },
  // Wave 7: Svarga Sopanam (Celestial Lapis & Gold Palace)
  {
    name: 'Svarga Sopanam',
    ambientWash: 'rgba(0, 50, 100, 0.14)',
    coreGlow1: 'rgba(255, 215, 0, 0.38)', coreGlow2: 'rgba(0, 188, 212, 0.2)',
    rayColor: 'rgba(255, 215, 0, 0.05)',
    flagstoneColor: 'rgba(255, 215, 0, 0.08)',
    kolamColor: 'rgba(255, 235, 59, 0.09)',
    accent: '#FFD700'
  },
  // Wave 8+: Maha-Sanctum (Supreme Golden Shikhara)
  {
    name: 'Maha-Sanctum',
    ambientWash: 'rgba(160, 70, 0, 0.16)',
    coreGlow1: 'rgba(255, 215, 0, 0.48)', coreGlow2: 'rgba(255, 143, 0, 0.26)',
    rayColor: 'rgba(255, 235, 59, 0.06)',
    flagstoneColor: 'rgba(255, 215, 0, 0.1)',
    kolamColor: 'rgba(255, 215, 0, 0.12)',
    accent: '#FFD700'
  }
];

function getCurrentRealm() {
  const w = Math.max(1, wave || 1);
  const idx = Math.min(w - 1, WAVE_REALMS.length - 1);
  return WAVE_REALMS[idx];
}

// --- Living Grand Temple Background with Dynamic Wave Atmospheres ---
function drawBackground() {
  ctx.clearRect(0, 0, W, H);

  // 1. Draw Grand Temple Artwork (crisp aspect-ratio covered)
  if (bgTempleLoaded && bgTempleImg.naturalWidth > 0) {
    const iw = bgTempleImg.naturalWidth;
    const ih = bgTempleImg.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(bgTempleImg, dx, dy, dw, dh);
  }

  const realm = getCurrentRealm();

  // 2. Wave-specific ambient wash overlay (subtle mood tint, keeping temple fully visible)
  if (realm.ambientWash) {
    ctx.fillStyle = realm.ambientWash;
    ctx.fillRect(0, 0, W, H);
  }

  // 3. Cinematic Radial Vignette (keeps gameplay focus on sanctum while softly framing edges)
  const vigR = Math.hypot(W, H) / 2;
  const vignette = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.32, cx, cy, vigR);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.75, 'rgba(10, 2, 20, 0.22)');
  vignette.addColorStop(1, 'rgba(10, 2, 20, 0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // 4. Center Sanctum Divine Aura Core around Ganesha
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, mandalaR * 3.4);
  coreGlow.addColorStop(0, realm.coreGlow1 || 'rgba(255, 215, 0, 0.32)');
  coreGlow.addColorStop(0.5, realm.coreGlow2 || 'rgba(255, 140, 0, 0.12)');
  coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, W, H);

  // 5. Rotating Sacred Sunburst / Mandala Rays
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(centrePulseTime * 0.03);
  const numRays = 16;
  ctx.fillStyle = realm.rayColor || 'rgba(255, 215, 0, 0.035)';
  for (let i = 0; i < numRays; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a1 = (i / numRays) * Math.PI * 2;
    const a2 = a1 + (Math.PI / numRays) * 0.45;
    ctx.arc(0, 0, spawnR, a1, a2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 6. Courtyard Flagstone Rings (Prakaram Floor Accents)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = realm.flagstoneColor || 'rgba(255, 215, 0, 0.06)';
  ctx.lineWidth = 1.2 * dpr;
  const flagstoneRadii = [mandalaR * 1.55, mandalaR * 2.2, mandalaR * 2.9, mandalaR * 3.7];
  for (let rad of flagstoneRadii) {
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Sacred Floor Kolam Watermark around Sanctum
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = realm.kolamColor || 'rgba(255, 215, 0, 0.07)';
  ctx.lineWidth = 1.2 * dpr;
  const numOuterPetals = 8;
  const outerR = mandalaR * 2.6;
  for (let i = 0; i < numOuterPetals; i++) {
    const a = (i / numOuterPetals) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * outerR * 0.55, Math.sin(a) * outerR * 0.55, outerR * 0.4, 0, Math.PI * 2);
    ctx.stroke();
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

// --- Obstacle Type Definitions & Behaviors (Aggressive Scaling from Level 1) ---
const OBS_CONFIG = {
  WISP: {
    name: 'MATSARASURA (SHADOW WISP)',
    baseSpeed: 92, // Fast, spectral, fluid from Wave 1
    hp: 1,
    points: 15,
    radius: 18
  },
  THORN: {
    name: 'KRODHASURA (BARBED BEAST)',
    baseSpeed: 108, // Rapid predator crawl
    hp: 1,
    points: 20,
    radius: 19
  },
  STONE: {
    name: 'LOBHASURA (STONE GOLEM)',
    baseSpeed: 70, // Heavy multi-hit crusher
    hp: 2,
    points: 35,
    radius: 23
  },
  SWARM: {
    name: 'ANALASURA (FIRE SCYTHE)',
    baseSpeed: 122, // Blazing hellfire rush
    hp: 1,
    points: 30,
    radius: 18
  },
  BOSS: {
    name: 'MAHAVIGHNA (ASURA EMPEROR)',
    baseSpeed: 62,
    hp: 10,
    points: 1000,
    radius: 46
  },
  ORB: {
    name: 'CURSED KARMA ORB',
    baseSpeed: 115,
    hp: 1,
    points: 40,
    radius: 14
  }
};

// --- Pixel Art Assets Generator ---
const PALETTE = {
  ' ': null, // transparent
  'b': '#000000', // black outline
  'd': '#330033', // dark purple (shadows)
  'p': '#8800ff', // purple (matsarasura)
  'm': '#ff00ff', // magenta (eyes)
  'r': '#ff0000', // red (fire/anger)
  'o': '#ff8800', // orange (fire)
  'y': '#ffff00', // yellow/gold
  'g': '#00ff00', // green (krodhasura)
  'w': '#ffffff', // white (highlights)
  's': '#555555', // dark stone
  'l': '#aaaaaa', // light stone
  'e': '#333333', // elephant dark
  't': '#ffddaa', // tusk
};

const PIXEL_ART_DATA = {
  WISP: [ // Matsarasura (Insect/Jealousy) - 16x16
    "      bbbb      ",
    "    bbppppbb    ",
    "   bppppppppb   ",
    "  bppppppppppb  ",
    " bpbbppppppbbpb ",
    " bpbmpbppbmbppb ",
    " bpbmmbppbmmbpb ",
    " bpbbppppppbbpb ",
    "  bppppppppppb  ",
    "  bppbbbbbbppb  ",
    "   bpbwbbwbpb   ",
    "    bpbbbbpb    ",
    "     bppppb     ",
    "     bppppb     ",
    "      bbbb      ",
    "                "
  ],
  THORN: [ // Krodhasura (Anger/Spikes) - 16x16
    "       bb       ",
    "   b   gg   b   ",
    "   bg bggb gb   ",
    " b  bggggggb  b ",
    " bgbgggggggbgb  ",
    "  bgggbbbbgggb  ",
    " bgggbrmmrbgggb ",
    " bgggbrmmrbgggb ",
    "  bgggbbbbgggb  ",
    " bgbgggggggbgb  ",
    " b  bggggggb  b ",
    "   bg bggb gb   ",
    "   b   gg   b   ",
    "       bb       ",
    "                ",
    "                "
  ],
  STONE: [ // Lobhasura (Greed/Armored) - 16x16
    "  bbbbbbbbbbbb  ",
    " bsllllllllssb  ",
    " bsllyyyyllssb  ",
    " bslyllllsylsb  ",
    " bsllylslyllsb  ",
    " bslslyylsllsb  ",
    " bslyybbbyylsb  ",
    " bslybmmmbylsb  ",
    " bslyybbbyylsb  ",
    " bslslyylsllsb  ",
    " bsllylslyllsb  ",
    " bslyllllsylsb  ",
    " bsllyyyyllssb  ",
    " bsllllllllssb  ",
    "  bbbbbbbbbbbb  ",
    "                "
  ],
  SWARM: [ // Analasura (Fire) - 16x16
    "      b  b      ",
    "     bo  ob     ",
    "    bro  orb    ",
    "   brrooorrb   ",
    "   broyyyyorb   ",
    "  broywyywyorb  ",
    "  broywyywyorb  ",
    "  broyyyyyorb  ",
    "  brroyyyyorrb  ",
    "   brroooyrrb   ",
    "   brroooorrb   ",
    "    brooorb    ",
    "     broob      ",
    "      bbb       ",
    "       b        ",
    "                "
  ],
  ORB: [ // Parashu (Axe) - 16x16
    "       bb       ",
    "      byyb      ",
    "     byyyyb     ",
    "   bbyywwyybb   ",
    "  byyyywwyyyyb  ",
    " byyybbwwbbyyyb ",
    " byybyywwyybyyb ",
    "  bbb ywwy bbb  ",
    "      bwwb      ",
    "      bwwb      ",
    "      byyb      ",
    "      byyb      ",
    "      byyb      ",
    "      byyb      ",
    "       bb       ",
    "                "
  ],
  BOSS: [ // Gajamukhasura (Elephant Demon) - 32x32
    "                                ",
    "                                ",
    "            bbbbbbbb            ",
    "          bbeeeeeeeebb          ",
    "         beeeeeeeeeeeeb         ",
    "        beeeeeeeeeeeeeeb        ",
    "       beeeeeeeeeeeeeeeeb       ",
    "       beeebbbbeeeebbbbeeb      ",
    "      beeeebmmbeeeebmmbeeeb     ",
    "      beeeebmmbeeeebmmbeeeb     ",
    "      beeeebbbbeeeebbbbeeeb     ",
    "     beeeeeeeeeeeeeeeeeeeeeb    ",
    "     beeeeeeeeeeebbeeeeeeeeb    ",
    "    bteeeeeeeeeebbbbeeeeeeeetb  ",
    "    btteeeeeeeeeebbeeeeeeeettb  ",
    "    btteeeeeeeeeeeeeeeeeeeettb  ",
    "    btteeeeeeeeebeebeeeeeeettb  ",
    "    bwteeeeeeeeebeebeeeeeeetwb  ",
    "    bwteebbeeeeebeebeeeeebbetwb ",
    "    bwteb  beeeebeebeeeeb  betwb ",
    "     bwb   beeeebeebeeeeb   bwb ",
    "     bb    beeeebeebeeeeb    bb ",
    "           beeeebeebeeeeb       ",
    "           beeeeeeebeeeeb       ",
    "            beeeeeeeeeeeb       ",
    "            beeeeeeeeeeeb       ",
    "             beeeeeeeeeb        ",
    "              beeeeeeeb         ",
    "               beeeeeb          ",
    "                 bbb            ",
    "                                ",
    "                                "
  ]
};

const pixelSprites = {};

function generatePixelSprites() {
  for (const [key, data] of Object.entries(PIXEL_ART_DATA)) {
    const size = data.length;
    // Scale factor for crispy pixels. 16x16 -> 64x64, 32x32 -> 128x128
    const scale = size === 16 ? 4 : 4; 
    const canvas = document.createElement('canvas');
    canvas.width = size * scale; 
    canvas.height = size * scale;
    const pctx = canvas.getContext('2d');
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const char = data[y][x];
        if (PALETTE[char]) {
          pctx.fillStyle = PALETTE[char];
          pctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    pixelSprites[key] = canvas;
  }
}
// Generate them immediately on load
generatePixelSprites();
// ------------------------------------------

// --- Handcrafted Specific Mythical Demon Renderers (NO Plain Boxes!) ---

// 1. Matsarasura (Envy Demon / Shadow Wisp)
function drawMonsterWisp(ctx, o) {
  const r = o.radius;
  const time = o.animTime * 6;

  // Dark violet ethereal void aura
  const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.65);
  auraGrad.addColorStop(0, 'rgba(170, 0, 255, 0.45)');
  auraGrad.addColorStop(0.5, 'rgba(45, 10, 78, 0.25)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
  ctx.fill();

  // Undulating spectral smoke tendrils trailing behind
  ctx.strokeStyle = '#4A148C';
  ctx.lineWidth = 2.8 * dpr;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const angle = Math.PI * 0.5 + (i * 0.45);
    const wave = Math.sin(time + i * 1.2) * (r * 0.35);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (r * 0.4), Math.sin(angle) * (r * 0.4));
    ctx.quadraticCurveTo(
      Math.cos(angle) * (r * 1.1) + wave,
      Math.sin(angle) * (r * 1.1) + wave,
      Math.cos(angle) * (r * 1.6),
      Math.sin(angle) * (r * 1.6)
    );
    ctx.stroke();
  }

  // Demonic skull body
  ctx.fillStyle = '#1A002C';
  ctx.strokeStyle = '#8A2BE2';
  ctx.lineWidth = 1.8 * dpr;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Curved dark horns
  ctx.fillStyle = '#11001C';
  ctx.strokeStyle = '#D500F9';
  ctx.lineWidth = 1.2 * dpr;
  // Left horn
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.3);
  ctx.quadraticCurveTo(-r * 1.1, -r * 0.9, -r * 0.6, -r * 1.4);
  ctx.quadraticCurveTo(-r * 0.4, -r * 0.8, -r * 0.15, -r * 0.6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.3);
  ctx.quadraticCurveTo(r * 1.1, -r * 0.9, r * 0.6, -r * 1.4);
  ctx.quadraticCurveTo(r * 0.4, -r * 0.8, r * 0.15, -r * 0.6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Glowing demonic slit eyes (crimson with gold pupil)
  const eyePulse = 0.85 + Math.sin(time * 1.5) * 0.15;
  ctx.fillStyle = `rgba(255, 0, 64, ${eyePulse})`;
  ctx.shadowColor = '#FF0055';
  ctx.shadowBlur = 8 * dpr;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.05, r * 0.22, r * 0.12, -0.2, 0, Math.PI * 2);
  ctx.ellipse(r * 0.32, -r * 0.05, r * 0.22, r * 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Inner vertical slit pupil
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(-r * 0.34, -r * 0.12, 1.8 * dpr, r * 0.22);
  ctx.fillRect(r * 0.32, -r * 0.12, 1.8 * dpr, r * 0.22);
  ctx.shadowBlur = 0;
}

// 2. Krodhasura (Wrath / Barbed Demon Crawler)
function drawMonsterThorn(ctx, o) {
  const r = o.radius;
  const time = o.animTime * 8;

  // Predator legs scuttling on flanks
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2 * dpr;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 3; k++) {
      const legSway = Math.sin(time + k * 1.5) * (4 * dpr);
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -r * 0.3 + k * r * 0.35);
      ctx.lineTo(s * (r * 1.1 + legSway), -r * 0.2 + k * r * 0.4);
      ctx.lineTo(s * (r * 1.45 + legSway), -r * 0.05 + k * r * 0.45);
      ctx.stroke();
    }
  }

  // Central jagged beetle demon body
  ctx.fillStyle = '#0D230D';
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 1.6 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(r * 0.8, -r * 0.3);
  ctx.lineTo(r * 0.7, r * 0.5);
  ctx.lineTo(0, r * 0.95);
  ctx.lineTo(-r * 0.7, r * 0.5);
  ctx.lineTo(-r * 0.8, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Forward vicious curved blood horns
  ctx.fillStyle = '#B71C1C';
  ctx.strokeStyle = '#FF1744';
  ctx.lineWidth = 1.2 * dpr;
  // Left Horn
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.7);
  ctx.quadraticCurveTo(-r * 0.85, -r * 1.3, -r * 0.2, -r * 1.55);
  ctx.quadraticCurveTo(-r * 0.2, -r * 1.1, -r * 0.15, -r * 0.8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Right Horn
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.7);
  ctx.quadraticCurveTo(r * 0.85, -r * 1.3, r * 0.2, -r * 1.55);
  ctx.quadraticCurveTo(r * 0.2, -r * 1.1, r * 0.15, -r * 0.8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 3 Piercing yellow-green predatory eyes
  ctx.fillStyle = '#FFEA00';
  ctx.shadowColor = '#FFEA00';
  ctx.shadowBlur = 6 * dpr;
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, 2.5 * dpr, 0, Math.PI * 2);
  ctx.arc(r * 0.25, -r * 0.25, 2.5 * dpr, 0, Math.PI * 2);
  ctx.arc(0, -r * 0.4, 2.8 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// 3. Lobhasura (Greed / Armored Horned Obsidian Golem)
function drawMonsterStone(ctx, o) {
  const r = o.radius;
  const damaged = o.hp < o.maxHp;

  // Craggy obsidian polygon boulder
  ctx.fillStyle = damaged ? '#3D2820' : '#2A2A30';
  ctx.strokeStyle = damaged ? '#FF9100' : '#8D99AE';
  ctx.lineWidth = 2.5 * dpr;

  ctx.beginPath();
  const numPts = 8;
  for (let i = 0; i < numPts; i++) {
    const a = (i / numPts) * Math.PI * 2;
    const rad = r * (0.85 + (i % 2 === 0 ? 0.18 : -0.08));
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Massive granite horns
  ctx.fillStyle = '#1A1A1E';
  ctx.strokeStyle = damaged ? '#FF6D00' : '#B0B0B8';
  ctx.lineWidth = 1.5 * dpr;
  // Left Horn
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.4);
  ctx.lineTo(-r * 1.25, -r * 1.05);
  ctx.lineTo(-r * 0.35, -r * 0.85);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Right Horn
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.4);
  ctx.lineTo(r * 1.25, -r * 1.05);
  ctx.lineTo(r * 0.35, -r * 0.85);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Glowing Magma Fissures & Cracks
  ctx.strokeStyle = damaged ? '#FFF' : '#FF6D00';
  ctx.lineWidth = damaged ? 2.8 * dpr : 1.8 * dpr;
  ctx.shadowColor = '#FF3D00';
  ctx.shadowBlur = damaged ? 14 * dpr : 6 * dpr;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.lineTo(0, r * 0.25);
  ctx.lineTo(-r * 0.2, r * 0.65);
  ctx.moveTo(0, r * 0.25);
  ctx.lineTo(r * 0.45, 0);
  ctx.lineTo(r * 0.25, -r * 0.45);
  ctx.stroke();

  // Molten Magma Eye Slits
  ctx.fillStyle = damaged ? '#FFFFFF' : '#FFAB00';
  ctx.beginPath();
  ctx.rect(-r * 0.4, -r * 0.2, r * 0.25, 3.5 * dpr);
  ctx.rect(r * 0.15, -r * 0.2, r * 0.25, 3.5 * dpr);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// 4. Analasura (Hunger / Hellfire Scythe Demon)
function drawMonsterFire(ctx, o) {
  const r = o.radius;
  const time = o.animTime * 9;

  // Outer fire glow
  const fireAura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
  fireAura.addColorStop(0, 'rgba(255, 235, 59, 0.6)');
  fireAura.addColorStop(0.4, 'rgba(255, 87, 34, 0.4)');
  fireAura.addColorStop(1, 'rgba(198, 40, 40, 0)');
  ctx.fillStyle = fireAura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Spinning curved hellfire scythe blades
  const numBlades = 3;
  ctx.save();
  ctx.rotate(time);
  for (let i = 0; i < numBlades; i++) {
    ctx.save();
    ctx.rotate((i / numBlades) * Math.PI * 2);
    ctx.fillStyle = '#FF3D00';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.4, r * 1.4, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.9, r * 0.2, 0, 0);
    ctx.fill();
    // Inner yellow blade flame
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.25, r * 0.95, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.6, r * 0.1, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Central flaming demon skull
  ctx.fillStyle = '#1A0000';
  ctx.strokeStyle = '#FF6D00';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Blazing white/yellow eye spots
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.1, 2.2 * dpr, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r * 0.1, 2.2 * dpr, 0, Math.PI * 2);
  ctx.fill();
}

// 5. Mahavighna (Titan Asura Boss)
function drawMonsterBoss(ctx, o) {
  const r = o.radius;
  const time = o.animTime * 3;

  // Dark eclipse titan aura
  const aura = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.8);
  aura.addColorStop(0, 'rgba(74, 20, 140, 0.55)');
  aura.addColorStop(0.5, 'rgba(21, 0, 36, 0.4)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Massive demon elephant ears
  ctx.fillStyle = '#1F002C';
  ctx.strokeStyle = '#D500F9';
  ctx.lineWidth = 2 * dpr;
  // Left Ear
  ctx.beginPath();
  ctx.ellipse(-r * 0.9, -r * 0.2, r * 0.55, r * 0.75, -0.3, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Right Ear
  ctx.beginPath();
  ctx.ellipse(r * 0.9, -r * 0.2, r * 0.55, r * 0.75, 0.3, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Obsidian Titan Elephant Head
  ctx.fillStyle = '#0F0018';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2.5 * dpr;
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Curved demonic ivory tusks
  ctx.fillStyle = '#FFF8E1';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5 * dpr;
  // Left Tusk
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.2);
  ctx.quadraticCurveTo(-r * 1.1, r * 0.5, -r * 0.9, -r * 0.2);
  ctx.quadraticCurveTo(-r * 0.65, r * 0.1, -r * 0.35, r * 0.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Right Tusk
  ctx.beginPath();
  ctx.moveTo(r * 0.4, r * 0.2);
  ctx.quadraticCurveTo(r * 1.1, r * 0.5, r * 0.9, -r * 0.2);
  ctx.quadraticCurveTo(r * 0.65, r * 0.1, r * 0.35, r * 0.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Elephant Demon Trunk
  ctx.fillStyle = '#1A0026';
  ctx.strokeStyle = '#AA00FF';
  ctx.lineWidth = 2 * dpr;
  const trunkCurl = Math.sin(time) * (r * 0.25);
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.2);
  ctx.quadraticCurveTo(-r * 0.15 + trunkCurl, r * 0.9, trunkCurl, r * 1.35);
  ctx.quadraticCurveTo(r * 0.2 + trunkCurl, r * 0.9, r * 0.25, r * 0.2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Blazing Third Eye on Forehead
  ctx.fillStyle = '#FF1744';
  ctx.shadowColor = '#FF1744';
  ctx.shadowBlur = 15 * dpr;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45, r * 0.14, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFEA00';
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// 6. Heavy Dark Cursed Orb (ORB)
function drawMonsterOrb(ctx, o) {
  const r = o.radius;
  if (o.isDeflected) {
    // Blazing Divine Solar Missile of Pure Punya!
    const sunGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
    sunGrad.addColorStop(0, '#FFFFFF');
    sunGrad.addColorStop(0.3, '#FFD700');
    sunGrad.addColorStop(0.7, '#FF6F00');
    sunGrad.addColorStop(1, 'rgba(255, 111, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Cursed Dark Matter Sphere
  const darkGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.5);
  darkGrad.addColorStop(0, '#E040FB');
  darkGrad.addColorStop(0.4, '#311B92');
  darkGrad.addColorStop(0.85, '#0A0014');
  darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = darkGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#D500F9';
  ctx.lineWidth = 1.8 * dpr;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Central pulsating red demon eye
  ctx.fillStyle = '#FF1744';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// --- Structured Tactical Spawning & Aggressive Difficulty from Level 1 ---
function spawnSingleObstacle(type, customAngle = null) {
  const cfg = OBS_CONFIG[type];
  if (!cfg) return;

  const angle = customAngle !== null ? customAngle : (Math.random() * Math.PI * 2);
  const x = cx + Math.cos(angle) * spawnR;
  const y = cy + Math.sin(angle) * spawnR;

  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy);
  const speed = (cfg.baseSpeed + (wave - 1) * 8.5) * dpr;

  const obs = {
    x, y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    type,
    radius: cfg.radius * dpr,
    hp: cfg.hp,
    maxHp: cfg.hp,
    points: cfg.points,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 2,
    animTime: Math.random() * 10,
    trail: [],
    swarmOffsets: []
  };

  obstacles.push(obs);
}

function spawnObstacle() {
  // Wave 10 Boss Fight
  if (wave === 10) {
    if (waveObsSpawned === 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = W * 0.9;
      obstacles.push({
        type: 'BOSS',
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        hp: 10,
        rot: 0,
        rotSpeed: 1.5,
        animTime: 0,
        radius: OBS_CONFIG['BOSS'].radius * dpr,
        points: OBS_CONFIG['BOSS'].points,
        angle: angle,
        shootTimer: 1.8
      });
      waveObsCount = 999;
    }
    spawnSingleObstacle('WISP');
    return;
  }

  // Structured Pool from Wave 1: No slow boring crawl!
  let pool = ['WISP', 'WISP', 'THORN'];
  if (wave >= 2) pool = ['WISP', 'THORN', 'THORN'];
  if (wave >= 3) pool = ['WISP', 'THORN', 'STONE', 'STONE']; // Early Stone Golem!
  if (wave >= 4) pool = ['THORN', 'STONE', 'SWARM', 'SWARM']; // Early Fire Scythe!
  if (wave >= 5) pool = ['WISP', 'THORN', 'STONE', 'SWARM'];

  const type = pool[Math.floor(Math.random() * pool.length)];
  const primaryAngle = Math.random() * Math.PI * 2;
  spawnSingleObstacle(type, primaryAngle);

  // Tactical Pincer Attack Formation (Double spawn on opposite angles)
  if (wave >= 3 && Math.random() < 0.28 + (wave * 0.04) && waveObsSpawned < waveObsCount - 1) {
    const secondaryType = pool[Math.floor(Math.random() * pool.length)];
    const pincerAngle = primaryAngle + Math.PI + (Math.random() - 0.5) * 0.4;
    spawnSingleObstacle(secondaryType, pincerAngle);
    waveObsSpawned++;
  }
}

// --- Obstacle Rendering Pipelines (Pixelated Retro Sprites & Hard Hitpoint Boxes) ---
function drawObstacles() {
  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y);

    // Get the sprite from our generated pixel art assets
    const sprite = pixelSprites[o.type];

    if (sprite) {
      ctx.rotate(o.rot);

      // Flash effect if damaged (for multi-hit STONE block or BOSS)
      if (o.type === 'STONE' && o.hp < o.maxHp) {
        ctx.shadowColor = C.gold;
        ctx.shadowBlur = 18 * dpr;
      }
      if (o.type === 'BOSS' && o.hp < o.maxHp) {
        ctx.shadowColor = C.vighnaCore;
        ctx.shadowBlur = 22 * dpr;
      }

      // Draw the pixel art sprite with crisp, non-smoothed pixels
      const drawSize = o.radius * 2.2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.imageSmoothingEnabled = true;

      // Crack overlay & HP indicator for damaged multi-hit Stone Block
      if (o.type === 'STONE' && o.hp < o.maxHp) {
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 2.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(-drawSize * 0.28, -drawSize * 0.32);
        ctx.lineTo(0, 0);
        ctx.lineTo(drawSize * 0.25, drawSize * 0.28);
        ctx.moveTo(0, 0);
        ctx.lineTo(-drawSize * 0.3, drawSize * 0.18);
        ctx.stroke();

        // 1 HP remaining text
        ctx.fillStyle = C.gold;
        ctx.font = `bold ${10 * dpr}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4 * dpr;
        ctx.fillText('1 HP', 0, -drawSize * 0.55);
        ctx.shadowBlur = 0;
      }
    } else {
      // Fallback
      if (o.type === 'STONE') drawMonsterStone(ctx, o);
      else if (o.type === 'THORN') drawMonsterThorn(ctx, o);
      else if (o.type === 'SWARM') drawMonsterFire(ctx, o);
      else if (o.type === 'BOSS') drawMonsterBoss(ctx, o);
      else if (o.type === 'ORB') drawMonsterOrb(ctx, o);
      else drawMonsterWisp(ctx, o);
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
    const tutFontSize = Math.min(16, W / 26) * dpr;
    ctx.font = `600 ${tutFontSize}px "Outfit", sans-serif`;
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
    sfxStoneCrack();
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
    sfxDholBeat(false);
  }

  score += pts;
  obstaclesCleared++;

  // Emit rich marigold + gold particle bursts
  emitBlessingParticles(o.x, o.y, isCloseSave ? 32 : 18, C.gold, isCloseSave);

  // Stone Block breaks into multiple stone chunks and bronze dust
  if (o.type === 'STONE') {
    sfxStoneCrack();
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
        color: Math.random() > 0.4 ? C.gold : '#FF3D00',
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
  // Snappy, aggressive pacing scaling starting from Level 1
  spawnInterval = Math.max(0.32, 0.95 - wave * 0.08);
  spawnTimer = spawnInterval - 0.25;
  waveObsCount = 14 + wave * 6;
  waveObsSpawned = 0;
  waveMisses = 0;
  state = STATE.PLAYING;

  sfxShankha(); // Ceremonial conch blast heralds every wave
  triggerMushikaVoice(wave + 1); // Mooshak provokes and rallies Ganesha!

  if (uiHudWaveText) {
    uiHudWaveText.textContent = wave === 9 ? 'MAHAVIGHNA' : `WAVE ${toRoman(wave + 1)}`;
  }
}

function checkWaveEnd() {
  if (waveObsSpawned >= waveObsCount && obstacles.length === 0) {
    sfxWaveComplete();
    const bonus = waveMisses === 0 ? 300 : 75;
    score += bonus;
    updateHUDScore();

    wave++;
    if (wave >= 10) {
      // Boss defeated / Game complete
      return;
    }

    emitBlessingParticles(cx, cy, 35, C.gold);
    if (waveMisses === 0) {
      addPopup(cx, cy - mandalaR * 1.8, '✨ PERFECT WAVE! +300 ✨', C.gold, 22);
    } else {
      addPopup(cx, cy - mandalaR * 1.8, `WAVE ${toRoman(wave)} COMPLETE! +${bonus}`, C.marigold, 18);
    }

    state = STATE.WAVE_TRANS;
    transTimer = 1.0;
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
  if (!currentDevotee.name || !currentDevotee.campus) {
    openRegistrationModal(false);
    return;
  }

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

  updateDevoteeUI();
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

  // Populate Devotee Details on Game Over screen
  if (uiGoDevoteeName) uiGoDevoteeName.textContent = currentDevotee.name || 'Devotee';
  if (uiGoDevoteeCampus) uiGoDevoteeCampus.textContent = currentDevotee.campus || 'NIAT Campus';

  // Save session record to physical Excel database & local storage
  recordScoreToDatabase(score, wave, obstaclesCleared, bestCombo, blessings);

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

  // 2. Check Obstacles (target closest to tap)
  let closestIdx = -1;
  let closestDist = Infinity;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'BOSS') continue; // Boss cannot be tapped
    const dist = Math.hypot(tapX - o.x, tapY - o.y);
    if (dist < o.radius + tapR && dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  if (closestIdx !== -1) {
    const o = obstacles[closestIdx];
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
      } else {
        destroyObstacle(closestIdx);
      }
    } else {
      destroyObstacle(closestIdx);
    }
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


// Mooshak Companion Dialogue Listeners (Voice audio removed per user request)
if (uiBtnMinimizeMushika) {
  uiBtnMinimizeMushika.addEventListener('click', (e) => {
    e.stopPropagation();
    if (uiMushikaCompanion) {
      uiMushikaCompanion.classList.toggle('minimized');
    }
  });
}

const uiMushikaAvatar = document.getElementById('mushikaAvatar');
if (uiMushikaAvatar) {
  uiMushikaAvatar.addEventListener('click', () => {
    initAudio();
    if (uiMushikaCompanion) {
      uiMushikaCompanion.classList.remove('minimized');
    }
    if (state === STATE.PLAYING) {
      triggerMushikaVoice(wave);
    } else {
      playVoiceNarration(
        null,
        "Prabhu Ganesha! Five sacred Akhanda Diyas burn within your sanctum. Tap approaching demons to strike with your Parashu! Break every obstacle!",
        'MOOSHAK VAHANA'
      );
    }
  });
}

// Devotee Profile & Registration Modal Listeners
if (uiBtnSwitchDevotee) {
  uiBtnSwitchDevotee.addEventListener('click', (e) => {
    e.stopPropagation();
    openRegistrationModal(true);
  });
}

if (uiTitleDevoteeCard) {
  uiTitleDevoteeCard.addEventListener('click', (e) => {
    if (!e.target.closest('#btnSwitchDevotee')) {
      openRegistrationModal(true);
    }
  });
}

if (uiBtnSaveRegistration) {
  uiBtnSaveRegistration.addEventListener('click', () => {
    if (saveDevoteeProfile()) {
      // Profile saved successfully
    }
  });
}

if (uiBtnCancelRegistration) {
  uiBtnCancelRegistration.addEventListener('click', closeRegistrationModal);
}

// Leaderboard & Excel Modal Listeners
if (uiBtnOpenLeaderboard) {
  uiBtnOpenLeaderboard.addEventListener('click', () => openLeaderboardModal('campuses'));
}

if (uiBtnGoLeaderboard) {
  uiBtnGoLeaderboard.addEventListener('click', () => openLeaderboardModal('campuses'));
}

if (uiBtnCloseLeaderboard) {
  uiBtnCloseLeaderboard.addEventListener('click', closeLeaderboardModal);
}

if (uiTabBtnCampuses) {
  uiTabBtnCampuses.addEventListener('click', () => {
    currentLeaderboardTab = 'campuses';
    uiTabBtnCampuses.classList.add('is-active');
    if (uiTabBtnSessions) uiTabBtnSessions.classList.remove('is-active');
    renderLeaderboardTable();
  });
}

if (uiTabBtnSessions) {
  uiTabBtnSessions.addEventListener('click', () => {
    currentLeaderboardTab = 'sessions';
    uiTabBtnSessions.classList.add('is-active');
    if (uiTabBtnCampuses) uiTabBtnCampuses.classList.remove('is-active');
    renderLeaderboardTable();
  });
}

if (uiBtnCloseLeaderboardBottom) {
  uiBtnCloseLeaderboardBottom.addEventListener('click', closeLeaderboardModal);
}

// Devotee Card Modal Listeners
if (uiBtnOpenDevoteeCard) {
  uiBtnOpenDevoteeCard.addEventListener('click', openDevoteeCardModal);
}

if (uiBtnGoDevoteeCard) {
  uiBtnGoDevoteeCard.addEventListener('click', openDevoteeCardModal);
}

if (uiBtnCloseDevoteeCard) {
  uiBtnCloseDevoteeCard.addEventListener('click', closeDevoteeCardModal);
}

if (uiBtnCloseCardBottom) {
  uiBtnCloseCardBottom.addEventListener('click', closeDevoteeCardModal);
}

if (uiBtnDownloadCardPng) {
  uiBtnDownloadCardPng.addEventListener('click', downloadDevoteeCardImage);
}

const langButtonConfig = [
  { id: 'btnCardLangEn', lang: 'en' },
  { id: 'btnCardLangTa', lang: 'ta' },
  { id: 'btnCardLangTe', lang: 'te' },
  { id: 'btnCardLangHi', lang: 'hi' },
  { id: 'btnCardLangKn', lang: 'kn' },
  { id: 'btnCardLangMr', lang: 'mr' }
];

langButtonConfig.forEach(item => {
  const btn = document.getElementById(item.id);
  if (btn) {
    btn.addEventListener('click', () => {
      cardLanguage = item.lang;
      userManuallyChangedLang = true;
      updateCardLangButtons();
      renderDevoteeCard();
    });
  }
});

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
                 playVoiceNarration('assets/audio/mushika_victory.mp3', 'Jaya Ganesha! Victory is ours! You broke every obstacle and saved the universe! Now, where is my victory modak?', 'MOOSHAK VAHANA');
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

        if (Math.random() < 0.45 || blessings === 1) {
          playVoiceNarration('assets/audio/mushika_breach.mp3', 'Prabhu, watch out! A sacred diya has been extinguished! Defend the sanctum!', 'MOOSHAK VAHANA');
        }

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

  // (Swipe trail removed as per user feedback favoring tap mechanics)

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// Initialize & Launch
initAmbient();
updateDevoteeUI();

// Check if user has already registered
if (!currentDevotee.name || !currentDevotee.campus) {
  setTimeout(() => openRegistrationModal(false), 500);
}

requestAnimationFrame(gameLoop);

})();
