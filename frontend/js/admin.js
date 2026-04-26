/* ===================================================
   admin.js – Admin Dashboard logic
   =================================================== */

let currentPage = 1;
let totalPages  = 1;
let currentComplaintId = null;
let map = null;
let markersLayer = null;

// Expose functions to global scope for dynamic HTML (onclick)
window.openModal = openModal;
window.closeModal = closeModal;
window.submitStatusUpdate = submitStatusUpdate;
window.forceLogout = forceLogout;


document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!isLoggedIn() || !isAdmin()) {
    showToast('Admin access required.', 'error');
    setTimeout(() => (window.location.href = 'admin-login.html'), 1500);
    return;
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) panel.classList.add('active');
      // Lazy load on tab switch
      if (btn.dataset.tab === 'tab-resolved')  loadResolved();
      if (btn.dataset.tab === 'tab-users')     loadUsers();
      if (btn.dataset.tab === 'tab-inquiries') loadInquiries();
    });
  });

  // Pagination
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadComplaints(); }
  });
  document.getElementById('next-page-btn').addEventListener('click', () => {
    if (currentPage < totalPages) { currentPage++; loadComplaints(); }
  });
  document.getElementById('apply-filters-btn').addEventListener('click', () => {
    currentPage = 1; loadComplaints();
  });

  // Escalate stale
  document.getElementById('escalate-btn').addEventListener('click', async () => {
    const res = await apiFetch('/admin/escalate', { method: 'POST' });
    if (res?.ok) showToast(res.data.message, 'success');
    else showToast('Escalation failed.', 'error');
    loadComplaints();
  });

  // Initial loads
  initMap();
  Promise.all([loadStats(), loadComplaints()]);
  
  // Real-time updates (check every 30 seconds if tab is visible)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      Promise.all([loadStats(), loadComplaints(true)]);
    }
  }, 30000);
});

// ── Live Map ──────────────────────────────────────────────────────────────────
function initMap() {
  if (map || typeof L === 'undefined') return;
  const container = document.getElementById('outage-map');
  if (!container) return;

  // Initialize map centered at a default location
  map = L.map('outage-map').setView([31.25, 75.70], 10); 
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  markersLayer = L.layerGroup().addTo(map);
  
  // Fix for map not rendering properly in some containers
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      window.dispatchEvent(new Event('resize'));
    }
  }, 500);
}

function updateMapMarkers(complaints) {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  
  const bounds = [];
  complaints.forEach(c => {
    if (c.location && c.location.lat && c.location.lng) {
      const color = c.status === 'pending' ? '#ff4444' : '#00d4ff';
      const marker = L.circleMarker([c.location.lat, c.location.lng], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).bindPopup(`
        <div style="font-family:sans-serif; color:#333;">
          <strong>ID:</strong> ${c.trackingId}<br>
          <strong>Type:</strong> ${c.problemType}<br>
          <strong>Status:</strong> <span style="color:${color};font-weight:bold;">${c.status}</span>
        </div>
      `);
      markersLayer.addLayer(marker);
      bounds.push([c.location.lat, c.location.lng]);
    }
  });
  
  if (bounds.length > 0 && map) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const json = await res.json();
    if (!json.success) return;
    const s = json.stats;
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
    console.error('Failed to load stats:', err);
  }
}

// ── Charts ────────────────────────────────────────────────────────────────────
let chartStatus = null, chartTypes = null;
function drawCharts(s) {
  const colors = ['#ff4444','#00d4ff','#00e676'];

  // 1. Status distribution (Pie Chart)
  const ctxS = document.getElementById('chart-status')?.getContext('2d');
  if (ctxS) {
    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(ctxS, {
      type: 'pie',
      data: {
        labels: ['Pending','In Progress','Resolved'],
        datasets: [{ data: [s.pending||0, s.inProgress||0, s.resolved||0], backgroundColor: colors, borderWidth: 1, borderColor: '#1a1a2e' }],
      },
      options: { 
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: { color: '#7a9bbf', font: { size: 11 } } 
          } 
        }, 
        responsive: true,
        maintainAspectRatio: false
      },
    });
  }

  // 2. Problem Categories (Bar Chart)
  const ctxT = document.getElementById('chart-types')?.getContext('2d');
  if (ctxT && s.typeCounts) {
    if (chartTypes) chartTypes.destroy();
    
    // Get labels and data dynamically from the stats object
    const typeLabels = Object.keys(s.typeCounts).map(t => t.charAt(0).toUpperCase() + t.slice(1));
    const typeData = Object.values(s.typeCounts);

    chartTypes = new Chart(ctxT, {
      type: 'bar',
      data: {
        labels: typeLabels,
        datasets: [{
          label: 'Complaints',
          data: typeData,
          backgroundColor: ['#ff4444','#f5c518','#00d4ff','#00e676','#a29bfe','#fab1a0'],
          borderRadius: 6,
          borderWidth: 0,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#7a9bbf' }, grid: { color: 'rgba(0,212,255,0.05)' } },
          y: { ticks: { color: '#7a9bbf' }, grid: { color: 'rgba(0,212,255,0.05)' }, beginAtZero: true },
        },
      },
    });
  }
}

// ── Active Complaints ─────────────────────────────────────────────────────────
async function loadComplaints(silent = false) {
  const el = document.getElementById('complaints-list');
  if (!el) return;
  if (!silent) el.innerHTML = '<div class="spinner"></div>';

  const status    = document.getElementById('filter-status')?.value    || '';
  const type      = document.getElementById('filter-type')?.value      || '';
  const escalated = document.getElementById('filter-escalated')?.value || '';

  const params = new URLSearchParams({ page: currentPage, limit: 15 });
  if (status)    params.set('status', status);
  if (type)      params.set('problemType', type);
  if (escalated) params.set('escalated', escalated);

  try {
    const res = await apiFetch(`/admin/complaints?${params}`);
    if (!res?.ok) { el.innerHTML = '<p style="color:var(--accent-red);">Failed to load complaints.</p>'; return; }

    const { complaints = [], total, pages } = res.data;
    totalPages = pages || 1;
    setText('page-info', `Page ${currentPage} of ${totalPages} (${total} total)`);
    
    // Update Map with complaint data
    updateMapMarkers(complaints);

    if (complaints.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);padding:1rem 0;">No complaints found.</p>';
      return;
    }

    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Tracking ID</th><th>Consumer</th><th>Area</th><th>Problem</th><th>Status</th><th>Escalated</th><th>Date</th><th>Location</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${complaints.map(c => `
              <tr>
                <td><code style="color:var(--accent-yellow);font-size:0.82rem;">${c.trackingId}</code></td>
                <td style="font-size:0.83rem;">${c.consumerId}</td>
                <td>
                  ${c.location?.lat
                    ? `<a href="https://www.google.com/maps?q=${c.location.lat},${c.location.lng}" target="_blank"
                         style="color:var(--accent-blue);text-decoration:none;" title="Open in Google Maps">
                         📍 ${c.areaName}</a>`
                    : c.areaName}
                </td>
                <td style="text-transform:capitalize;font-size:0.83rem;">${c.problemType}</td>
                <td>${badgeHtml(c.status)}</td>
                <td>${c.escalated ? '<span class="badge badge-escalated">⚠️ Yes</span>' : '<span style="color:var(--text-dim);font-size:0.8rem;">No</span>'}</td>
                <td style="font-size:0.8rem;color:var(--text-dim);">${new Date(c.createdAt).toLocaleDateString()}</td>
                <td style="font-size:0.8rem;">
                  ${c.location?.lat
                    ? `<a href="https://www.google.com/maps?q=${c.location.lat},${c.location.lng}" target="_blank" style="color:var(--accent-blue);">🗺️ Map</a>`
                    : '—'}
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="openModal('${c._id}','${c.trackingId}','${c.status}')">
                    Update
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {
    el.innerHTML = '<p style="color:var(--accent-red);">Network error.</p>';
  }
}

// ── Resolved Complaints ───────────────────────────────────────────────────────
async function loadResolved() {
  const el = document.getElementById('resolved-list');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/admin/complaints/resolved');
    if (!res?.ok) { el.innerHTML = '<p style="color:var(--accent-red);">Failed to load.</p>'; return; }
    const { resolved = [] } = res.data;
    if (resolved.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);">No resolved complaints yet.</p>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Tracking ID</th><th>Consumer</th><th>Area</th><th>Problem</th><th>Filed</th><th>Resolved</th>
          </tr></thead>
          <tbody>
            ${resolved.map(c => `
              <tr>
                <td><code style="color:var(--accent-yellow);font-size:0.82rem;">${c.trackingId}</code></td>
                <td style="font-size:0.83rem;">${c.consumerId}</td>
                <td>
                  ${c.location?.lat
                    ? `<a href="https://www.google.com/maps?q=${c.location.lat},${c.location.lng}" target="_blank"
                         style="color:var(--accent-blue);text-decoration:none;">📍 ${c.areaName}</a>`
                    : c.areaName}
                </td>
                <td style="text-transform:capitalize;font-size:0.83rem;">${c.problemType}</td>
                <td style="font-size:0.8rem;color:var(--text-dim);">${new Date(c.createdAt).toLocaleDateString()}</td>
                <td style="font-size:0.8rem;color:var(--accent-green);">${new Date(c.resolvedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {}
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const el = document.getElementById('users-list');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/admin/users');
    if (!res?.ok) { el.innerHTML = '<p style="color:var(--accent-red);">Failed to load users.</p>'; return; }
    const { users = [] } = res.data;
    if (users.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);">No users found.</p>'; return; }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Consumer ID</th><th>Phone</th><th>Active Session</th><th>Registered</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td style="font-size:0.83rem;">${u.email}</td>
                <td><code style="color:var(--accent-yellow);font-size:0.82rem;">${u.consumerId}</code></td>
                <td style="font-size:0.83rem;">${u.phone}</td>
                <td>
                  ${(u.activeSession && new Date(u.activeSessionExpiresAt) > new Date()) 
                    ? '<span class="badge badge-progress">Active</span>' 
                    : '<span style="color:var(--text-dim);font-size:0.8rem;">None</span>'}
                </td>
                <td style="font-size:0.8rem;color:var(--text-dim);">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-outline btn-sm" style="color:var(--accent-red); border-color:var(--accent-red);" onclick="forceLogout('${u._id}')">
                    Force Logout
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {}
}

// ── Inquiries (Contact Messages) ─────────────────────────────────────────────
async function loadInquiries() {
  const el = document.getElementById('inquiries-list');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/admin/messages');
    if (!res?.ok) { el.innerHTML = '<p style="color:var(--accent-red);">Failed to load messages.</p>'; return; }
    const { messages = [] } = res.data;
    if (messages.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">No inquiries found.</p>'; return; }
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Received</th>
          </tr></thead>
          <tbody>
            ${messages.map(m => `
              <tr style="${m.status === 'unread' ? 'background:rgba(0,212,255,0.02);' : ''}">
                <td style="font-weight:600;">${m.name}</td>
                <td><a href="mailto:${m.email}" style="color:var(--accent-blue);">${m.email}</a></td>
                <td style="text-transform:capitalize;">${m.subject}</td>
                <td style="max-width:300px; font-size:0.85rem; color:var(--text-dim);">${m.message}</td>
                <td style="font-size:0.8rem; white-space:nowrap;">${new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('Failed to load inquiries:', err);
    el.innerHTML = '<p style="color:var(--accent-red);">Network error.</p>';
  }
}

// ── Status Modal ──────────────────────────────────────────────────────────────
function openModal(id, trackingId, currentStatus) {
  currentComplaintId = id;
  document.getElementById('modal-tracking-id').textContent = trackingId;
  document.getElementById('modal-status').value = currentStatus;
  document.getElementById('modal-note').value    = '';
  document.getElementById('status-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('status-modal').style.display = 'none';
  currentComplaintId = null;
}

// Close on backdrop click
document.getElementById('status-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('status-modal')) closeModal();
});

async function submitStatusUpdate() {
  if (!currentComplaintId) return;
  const status    = document.getElementById('modal-status').value;
  const adminNote = document.getElementById('modal-note').value.trim();
  const btn = document.getElementById('modal-submit-btn');
  btn.disabled = true; btn.textContent = 'Updating…';

  try {
    const res = await apiFetch(`/admin/complaints/${currentComplaintId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNote }),
    });
    if (res?.ok) {
      showToast(res.data.message, 'success');
      closeModal();
      loadComplaints();
      loadStats();
    } else {
      showToast(res?.data?.message || 'Update failed.', 'error');
    }
  } catch {
    showToast('Network error.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Update Status';
  }
}

async function forceLogout(userId) {
  if (!confirm('Are you sure you want to force logout this user?')) return;
  try {
    const res = await apiFetch(`/admin/users/${userId}/force-logout`, { method: 'POST' });
    if (res?.ok) {
      showToast(res.data.message, 'success');
      loadUsers();
    } else {
      showToast('Failed to force logout.', 'error');
    }
  } catch {
    showToast('Network error.', 'error');
  }
}



// ── Helpers ───────────────────────────────────────────────────────────────────
function badgeHtml(status) {
  const map = { pending: 'badge-pending', 'in-progress': 'badge-progress', resolved: 'badge-resolved' };
  return `<span class="badge ${map[status]||''}">${status}</span>`;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
