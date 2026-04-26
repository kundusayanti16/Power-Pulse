/* ===================================================
  auth.js – Registration and Login flows
   =================================================== */

// ── Helpers ───────────────────────────────────────────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}
function clearErrs(...ids) { ids.forEach(id => showErr(id, '')); }
function setLoading(btnId, loading, text = 'Submit') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : text;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGISTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const registerForm = document.getElementById('register-form');
if (registerForm) {
  // Auto-generate professional Consumer ID on load
  const cidInput = document.getElementById('consumerId');
  if (cidInput && !cidInput.value) {
    cidInput.value = 'ELEC' + Math.floor(100000 + Math.random() * 900000);
    cidInput.readOnly = true;
    cidInput.style.background = 'rgba(0,0,0,0.2)';
    cidInput.style.cursor = 'not-allowed';
    cidInput.title = 'Automatically generated unique Consumer ID';
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrs('name-err','email-err','phone-err','cid-err','pass-err');

    const name       = document.getElementById('name').value.trim();
    const email      = document.getElementById('email').value.trim();
    const phone      = document.getElementById('phone').value.trim();
    const consumerId = document.getElementById('consumerId').value.trim();
    const password   = document.getElementById('password').value;

    // Client-side validation
    let valid = true;
    if (!name)       { showErr('name-err', 'Name is required.');             valid = false; }
    if (!email)      { showErr('email-err', 'Email is required.');           valid = false; }
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      showErr('email-err', 'This email looks fake or invalid. Please use a real email.'); valid = false;
    }
    if (!phone)      { showErr('phone-err', 'Phone number is required.');    valid = false; }
    else if (!/^(\+91|0)?[6-9]\d{9}$/.test(phone)) {
      showErr('phone-err', 'Invalid phone number. Use 10 digits (e.g. 9876543210) or include +91.'); valid = false;
    }
    if (!consumerId) { showErr('cid-err', 'Consumer ID is required.');       valid = false; }
    if (!password)   { showErr('pass-err', 'Password is required.');         valid = false; }
    else if (password.length < 6) { showErr('pass-err', 'Min 6 characters.'); valid = false; }
    if (!valid) return;

    setLoading('reg-btn', true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, consumerId, password }),
      });
      if (!res) return;
      if (res.ok) {
        triggerCircuitGlow();
        showToast('Registration successful! Redirecting to login…', 'success');
        setTimeout(() => (window.location.href = 'login.html'), 1800);
      } else {
        showToast(res.data.message || 'Registration failed.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading('reg-btn', false, 'Create Account');
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const loginForm = document.getElementById('login-form');
if (loginForm) {
  // Redirect if already logged in
  if (isLoggedIn() && !isAdmin()) window.location.href = 'complaint.html';

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrs('login-email-err', 'login-pass-err');

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    let valid = true;
    if (!email) { showErr('login-email-err', 'Email is required.'); valid = false; }
    else if (!/^\S+@\S+\.\S+$/.test(email)) { showErr('login-email-err', 'Invalid email.'); valid = false; }
    if (!password) { showErr('login-pass-err', 'Password is required.'); valid = false; }
    if (!valid) return;

    setLoading('login-btn', true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res) return;
      if (res.ok) {
        triggerCircuitGlow();
        setAuth(res.data.token, res.data.user);
        showToast('Login successful! Redirecting…', 'success');
        setTimeout(() => (window.location.href = 'complaint.html'), 1500);
      } else {
        if (res.data.errorCode === 'USER_NOT_FOUND') {
          showToast(`${res.data.message} Redirecting to registration...`, 'error', 3000);
          setTimeout(() => (window.location.href = 'register.html'), 2000);
        } else {
          showToast(res.data.message || 'Login failed.', 'error');
        }
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading('login-btn', false, 'Login');
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN LOGIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const adminLoginForm = document.getElementById('admin-login-form');
if (adminLoginForm) {
  if (isLoggedIn() && isAdmin()) window.location.href = 'admin-dashboard.html';

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!email || !password) { showToast('Email and password required.', 'error'); return; }

    setLoading('admin-login-btn', true);
    try {
      const res = await apiFetch('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res) return;
      if (res.ok) {
        triggerCircuitGlow();
        setAuth(res.data.token, res.data.user);
        showToast('Admin login successful!', 'success');
        setTimeout(() => (window.location.href = 'admin-dashboard.html'), 1200);
      } else {
        showToast(res.data.message || 'Invalid admin credentials.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setLoading('admin-login-btn', false, 'Admin Login');
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORGOT / RESET PASSWORD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const forgotForm = document.getElementById('forgot-form');
const resetForm  = document.getElementById('reset-form');

if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('f-email').value.trim();
    setLoading('f-btn', true, 'Sending…');
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res?.ok) {
        showToast(res.data.message, 'success');
        forgotForm.style.display = 'none';
        if (resetForm) resetForm.style.display = 'block';
      } else {
        showToast(res?.data?.message || 'Error sending OTP.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setLoading('f-btn', false, 'Send OTP');
    }
  });
}

if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('f-email').value.trim();
    const otp   = document.getElementById('r-otp').value.trim();
    const newPassword = document.getElementById('r-pass').value;

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading('r-btn', true, 'Resetting…');
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword }),
      });
      if (res?.ok) {
        showToast(res.data.message, 'success');
        setTimeout(() => (window.location.href = 'login.html'), 2000);
      } else {
        showToast(res?.data?.message || 'Invalid or expired OTP.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setLoading('r-btn', false, 'Reset Password');
    }
  });
}

