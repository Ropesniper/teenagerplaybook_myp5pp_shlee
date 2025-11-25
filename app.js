// app.js - main UI, auth, history, progress
// Local storage keys
const LS_USERS = 'psy_users_v2';
const LS_ACTIVE_USER = 'psy_active_user_v2';
const LS_HISTORY = 'psy_history_v2';
const LS_SESSION_EXP = 'psy_session_expiry_v2';
const LS_CONSENT = 'psy_consent_v2'; // consent timestamp (ms)

// DOM helpers
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

// Pages
const pages = {
  dashboard: qs('#dashboard'),
  sessions: qs('#sessions'),
  progress: qs('#progress'),
  history: qs('#history'),
  about: qs('#about'),
  login: qs('#login')
};

const navLogin = qs('#navLogin');
const btnLogout = qs('#btnLogout');

// Progress & history elements
const progressFill = qs('#progressFill');
const scoreParticipation = qs('#scoreParticipation');
const scoreConsistency = qs('#scoreConsistency');
const scorePositive = qs('#scorePositive');
const aiSuggestion = qs('#aiSuggestion');
const historyList = qs('#historyList');
const exportHistoryBtn = qs('#exportHistory');
const clearHistoryBtn = qs('#clearHistory');

// Auth elements
const authEmail = qs('#authEmail');
const authPassword = qs('#authPassword');
const btnLogin = qs('#btnLogin');
const authMsg = qs('#authMsg');
const rememberBox = qs('#rememberAgreement');

// Password hashing helpers (PBKDF2 using Web Crypto)
async function genSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(salt);
}
function arrayBufferToBase64(buf) {
  // buf is Uint8Array or ArrayBuffer
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function deriveKey(password, saltBase64) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const salt = base64ToArrayBuffer(saltBase64);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' },
    passKey,
    256
  );
  return arrayBufferToBase64(derivedBits);
}

// User storage functions
function usersGet() {
  const raw = localStorage.getItem(LS_USERS);
  return raw ? JSON.parse(raw) : [];
}
function usersSave(arr) { localStorage.setItem(LS_USERS, JSON.stringify(arr)); }

async function registerUser(email, password) {
  const users = usersGet();
  if (users.find(u => u.email === email)) return { ok: false, message: 'Account exists' };
  const salt = await genSalt();
  const hash = await deriveKey(password, salt);
  users.push({ email, salt, hash });
  usersSave(users);
  return { ok: true };
}

async function loginUser(email, password) {
  const users = usersGet();
  const u = users.find(x => x.email === email);
  if (!u) return { ok: false, message: 'No account' };
  const hash = await deriveKey(password, u.salt);
  if (hash === u.hash) {
    localStorage.setItem(LS_ACTIVE_USER, email);
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(LS_SESSION_EXP, String(expiry));
    return { ok: true };
  }
  return { ok: false, message: 'Wrong password' };
}

function logoutUser() {
  localStorage.removeItem(LS_ACTIVE_USER);
  localStorage.removeItem(LS_SESSION_EXP);
}

// active user
function activeUser() {
  return localStorage.getItem(LS_ACTIVE_USER);
}

// History functions
function historyGet() {
  const raw = localStorage.getItem(LS_HISTORY);
  return raw ? JSON.parse(raw) : [];
}
function historySave(arr) { localStorage.setItem(LS_HISTORY, JSON.stringify(arr)); }
function historyAdd(item) {
  const arr = historyGet();
  arr.unshift(item);
  historySave(arr);
}
function historyClearForUser(user) {
  const arr = historyGet().filter(x => x.user !== user);
  historySave(arr);
}

// UI helpers
function showPage(name) {
  Object.keys(pages).forEach(k => { pages[k].style.display = (k === name ? '' : 'none'); });
  updateAuthUI();
}

function updateAuthUI() {
  const user = activeUser();
  if (user) {
    navLogin.style.display = 'none';
    btnLogout.style.display = '';
  } else {
    navLogin.style.display = '';
    btnLogout.style.display = 'none';
  }
}

// navigation
qsa('[data-nav]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const id = (a.getAttribute('href') || '').replace('#', '') || 'dashboard';
    if ((id === 'sessions' || id === 'progress' || id === 'history') && !activeUser()) {
      showPage('login');
      return;
    }
    showPage(id);
  });
});

// quick goto
qsa('[data-goto]').forEach(b => {
  b.addEventListener('click', () => {
    const id = b.getAttribute('data-goto');
    if ((id === 'sessions' || id === 'progress' || id === 'history') && !activeUser()) { showPage('login'); return; }
    showPage(id);
  });
});

// login flow
btnLogin.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const pwd = authPassword.value;
  if (!email || !pwd || pwd.length < 6) { authMsg.textContent = 'Provide a valid email and password (min 6 chars).'; return; }

  // If user exists, try login; else create
  const users = usersGet();
  const exists = users.find(u => u.email === email);
  if (!exists) {
    // create account
    const res = await registerUser(email, pwd);
    if (!res.ok) { authMsg.textContent = res.message; return; }
    // login immediately
    await loginUser(email, pwd);
    authMsg.textContent = 'Account created and logged in.';
  } else {
    const res = await loginUser(email, pwd);
    if (!res.ok) { authMsg.textContent = res.message; return; }
    authMsg.textContent = 'Logged in.';
  }

  // handle consent remember checkbox separately in session flow
  showPage('dashboard');
  renderAll();
});

// logout
btnLogout.addEventListener('click', () => {
  logoutUser();
  showPage('login');
});

// auto-logout check
setInterval(() => {
  const raw = localStorage.getItem(LS_SESSION_EXP);
  if (!raw) return;
  if (Date.now() > Number(raw)) {
    logoutUser();
    alert('Session expired (7 days). Please log in again.');
    showPage('login');
  }
}, 30 * 1000);

// start session navigation (buttons in index open page but sessions are separate pages)
qsa('.start-session').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!activeUser()) { showPage('login'); return; }
    // Open target page in same tab, ensure consent check happens on session page
    const target = btn.getAttribute('data-target');
    if (target) window.location.href = target;
  });
});

// ---------------------------
// History UI
// ---------------------------
function renderHistory() {
  const all = historyGet().filter(x => x.user === activeUser());
  if (!all.length) {
    historyList.innerHTML = '<div class="muted">No sessions yet — start a session to create history.</div>';
    return;
  }
  historyList.innerHTML = '';
  all.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.innerHTML = `<div><strong>${item.type.toUpperCase()}</strong> • ${new Date(item.startedAt).toLocaleString()}</div>
                      <div class="history-meta">${item.summaryAI?.short || 'No AI summary'} ${item.note ? ' • note: ' + item.note : ''}</div>`;
    right.innerHTML = `<button class="btn button-small export-item">Export</button> <button class="btn button-small btn-danger delete-item">Delete</button>`;
    el.appendChild(left); el.appendChild(right);

    right.querySelector('.export-item').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `psyconnect_session_${item.id}.json`;
      a.click();
    });
    right.querySelector('.delete-item').addEventListener('click', () => {
      if (!confirm('Delete this session from local history?')) return;
      const arr = historyGet().filter(h => h.id !== item.id);
      historySave(arr);
      renderAll();
    });

    historyList.appendChild(el);
  });
}

exportHistoryBtn.addEventListener('click', () => {
  const arr = historyGet().filter(x => x.user === activeUser());
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(arr, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `psyconnect_history_${activeUser() || 'anon'}.json`;
  a.click();
});

clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Clear all your local history? This cannot be undone.')) return;
  const all = historyGet();
  const filtered = all.filter(x => x.user !== activeUser());
  historySave(filtered);
  renderAll();
});

// ---------------------------
// Progress calculation
// ---------------------------
function calcProgressForUser(user) {
  const arr = historyGet().filter(x => x.user === user);
  if (!arr.length) return null;
  const now = Date.now();

  const last30 = arr.filter(s => (now - new Date(s.startedAt)) <= 30 * 24 * 60 * 60 * 1000).length;
  const participationScore = Math.min(100, Math.round((last30 / 6) * 100));

  const sorted = arr.map(s => new Date(s.startedAt)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i] - sorted[i - 1]) / (24 * 60 * 60 * 1000));
  let consistencyScore = 50;
  if (gaps.length === 0) consistencyScore = 100;
  else {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(avgGap, 14) / 14) * 100)));
    consistencyScore = score;
  }

  const positive = arr.filter(s => {
    const lab = s.summaryAI?.dominantEmotion || (s.metrics && s.metrics.length && s.metrics[0].emotion && s.metrics[0].emotion.label);
    return lab === 'happy' || lab === 'neutral';
  }).length;
  const positiveRatio = Math.round((positive / arr.length) * 100);
  const overall = Math.round(participationScore * 0.3 + consistencyScore * 0.3 + positiveRatio * 0.4);

  let suggestion = '';
  if (overall >= 75) suggestion = 'Great progress — your sessions show consistent and positive emotional responses. Keep it up!';
  else if (overall >= 45) suggestion = 'Some positive signs. Try increasing session frequency or doing calming exercises after sessions.';
  else suggestion = 'More consistent practice could help. Try short daily 5-minute sessions and reflect on changes.';

  return { participationScore, consistencyScore, positiveRatio, overall, suggestion };
}

function renderProgress() {
  const user = activeUser();
  if (!user) {
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    scoreParticipation.textContent = '0%';
    scoreConsistency.textContent = '0%';
    scorePositive.textContent = '0%';
    aiSuggestion.textContent = 'Login and complete sessions to see progress.';
    return;
  }
  const r = calcProgressForUser(user);
  if (!r) {
    progressFill.style.width = '4%';
    progressFill.textContent = '0%';
    scoreParticipation.textContent = '0%';
    scoreConsistency.textContent = '0%';
    scorePositive.textContent = '0%';
    aiSuggestion.textContent = 'No sessions yet — start a session to begin tracking progress.';
    return;
  }
  progressFill.style.width = `${Math.max(4, r.overall)}%`;
  progressFill.textContent = `${r.overall}%`;
  scoreParticipation.textContent = `${r.participationScore}%`;
  scoreConsistency.textContent = `${r.consistencyScore}%`;
  scorePositive.textContent = `${r.positiveRatio}%`;
  aiSuggestion.textContent = r.suggestion;
}

// Render all
function renderAll() {
  updateAuthUI();
  renderHistory();
  renderProgress();
}

showPage('dashboard');
renderAll();

// handle hash
if (location.hash) {
  const id = location.hash.replace('#', '');
  if ((id === 'sessions' || id === 'progress' || id === 'history') && !activeUser()) showPage('login');
  else if (pages[id]) showPage(id);
}
