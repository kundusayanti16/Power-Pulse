/* ===================================================
   utils.js – Shared frontend helpers (v1.0.1)
   =================================================== */

// ── API base URL ──────────────────────────────────────────────────────────────
// Pointing directly to production backend as requested
const API_BASE = 'https://power-pulse-backend-production.up.railway.app/api';

console.log('[DEBUG] API_BASE is:', API_BASE);

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
async function loadStats() {
  try {
    console.log('[DEBUG] Loading stats...');
    const res = await apiFetch('/stats');
    if (!res?.ok) {
      console.error('[DEBUG] Stats fetch failed:', res);
      return;
    }
    
    const s = res.data.stats;
    if (!s) {
      console.error('[DEBUG] No stats data in response');
      return;
    }

    console.log('[DEBUG] Stats loaded successfully:', s);
    
    setText('stat-total',      s.totalFiled    ?? '--');
    setText('stat-pending',    s.pending       ?? '--');
    setText('stat-inprogress', s.inProgress    ?? '--');
    setText('stat-resolved',   s.resolved      ?? '--');
    setText('stat-rate',      (s.resolutionRate ?? '--') + '%');
    setText('footer-total',    s.totalFiled    ?? '--');
    setText('footer-pending',  s.pending       ?? '--');
    setText('footer-resolved', s.resolved      ?? '--');
    setText('footer-rate',    (s.resolutionRate ?? '--') + '%');
    
    // Draw both charts using pre-loaded stats
    drawCharts(s);
  } catch (err) {
    console.error('[DEBUG] Error in loadStats:', err);
  }
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
  console.log('🚪 [DEBUG] Logout initiated...');
  const wasAdmin = isAdmin();
  
  // 1. Clear local data first
  clearAuth();
  
  // 2. Redirect immediately
  const target = wasAdmin ? 'admin-login.html' : 'login.html';
  console.log(`🏠 [DEBUG] Redirecting to ${target}`);
  window.location.href = target;

  // 3. Try to notify backend in background (optional/best effort)
  try { 
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); 
  } catch (err) {}
}
window.handleLogout = handleLogout;

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

  // Attach logout to any button with id nav-logout or class btn-logout
  document.querySelectorAll('#nav-logout, .btn-logout').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });

  // Force clear login forms for security so they don't retain credentials
  const loginForm = document.getElementById('login-form');
  const adminLoginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.reset();
  if (adminLoginForm) adminLoginForm.reset();
});
