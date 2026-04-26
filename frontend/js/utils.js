/* ===================================================
   utils.js – Shared frontend helpers (v1.0.1)
   =================================================== */

// ── API base URL ──────────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5002/api'
  : 'https://power-pulse-backend-production.up.railway.app/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('ep_token'); }
function getUser()   { try { return JSON.parse(localStorage.getItem('ep_user')); } catch { return null; } }
function setAuth(token, user) {
  localStorage.setItem('ep_token', token);
  localStorage.setItem('ep_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('ep_token');
  localStorage.removeItem('ep_user');
}
function isLoggedIn()  { return !!getToken(); }
function isAdmin()     { const u = getUser(); return u && u.role === 'admin'; }

// ── API fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/admin-login')) {
    clearAuth();
    window.location.href = 'login.html';
    return null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Circuit Glow Effect ───────────────────────────────────────────────────────
function triggerCircuitGlow() {
  document.body.classList.remove('circuit-active');
  // Trigger reflow to restart animation
  void document.body.offsetWidth;
  document.body.classList.add('circuit-active');
  
  // Remove class after animation ends (2s)
  setTimeout(() => {
    document.body.classList.remove('circuit-active');
  }, 2000);
}

// ── Live footer stats ─────────────────────────────────────────────────────────
async function loadFooterStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const json = await res.json();
    if (!json.success) return;
    const s = json.stats;
    setText('stat-total',    s.totalFiled    ?? '--');
    setText('stat-pending',  s.pending       ?? '--');
    setText('stat-resolved', s.resolved      ?? '--');
    setText('stat-rate',    (s.resolutionRate ?? '--') + '%');
  } catch { /* silently fail */ }
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Navbar active link ────────────────────────────────────────────────────────
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

// ── Navbar auth state ─────────────────────────────────────────────────────────
function updateNavAuth() {
  const user = getUser();
  const loginDropdown = document.getElementById('login-dropdown');
  const registerBtn   = document.getElementById('nav-register');
  const logoutBtn     = document.getElementById('nav-logout');
  const userInfo      = document.getElementById('nav-user');

  if (user && isLoggedIn()) {
    if (loginDropdown) loginDropdown.style.display = 'none';
    if (registerBtn)   registerBtn.style.display   = 'none';
    if (logoutBtn)     logoutBtn.style.display     = 'inline-flex';
    if (userInfo)  { userInfo.style.display = 'block'; userInfo.textContent = `👤 ${user.name}`; }
  } else {
    if (loginDropdown) loginDropdown.style.display = 'inline-block';
    if (registerBtn)   registerBtn.style.display   = 'inline-flex';
    if (logoutBtn)     logoutBtn.style.display     = 'none';
    if (userInfo)      userInfo.style.display      = 'none';
  }
}

// ── Logout handler ────────────────────────────────────────────────────────────
async function handleLogout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
  clearAuth();
  window.location.href = 'login.html';
}

// ── Scroll Progress Bar ───────────────────────────────────────────────────────
function initScrollProgress() {
  const progressBar = document.createElement('div');
  progressBar.id = 'scroll-progress';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (height > 0) ? (winScroll / height) * 100 : 0;
    progressBar.style.width = scrolled + '%';
  });
}

// ── Hamburger menu toggle ─────────────────────────────────────────────────────
function initHamburger() {
  const ham = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  const right = document.querySelector('.nav-right');
  if (!ham) return;
  ham.addEventListener('click', () => {
    links?.classList.toggle('open');
    right?.classList.toggle('open');
  });
}

// ── Page init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  updateNavAuth();
  initHamburger();
  initScrollProgress();
  loadFooterStats();

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Force clear login forms for security so they don't retain credentials
  const loginForm = document.getElementById('login-form');
  const adminLoginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.reset();
  if (adminLoginForm) adminLoginForm.reset();
});
