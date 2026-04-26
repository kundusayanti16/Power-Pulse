/* ===================================================
   complaint.js – File complaint + load user complaints
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!isLoggedIn()) {
    document.getElementById('auth-warning').style.display = 'block';
    document.getElementById('complaint-form').style.display = 'none';
    return;
  }

  // Pre-fill Consumer ID from stored user
  const user = getUser();
  if (user && user.consumerId) {
    const cidField = document.getElementById('c-consumerId');
    if (cidField) { cidField.value = user.consumerId; cidField.readOnly = true; }
  }

  // Geolocation
  const geoBtn = document.getElementById('geo-btn');
  if (geoBtn) {
    geoBtn.addEventListener('click', () => {
      const status = document.getElementById('geo-status');
      status.textContent = '📡 Detecting location…';
      if (!navigator.geolocation) {
        status.textContent = '❌ Geolocation not supported by your browser.';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          document.getElementById('c-lat').value = lat;
          document.getElementById('c-lng').value = lng;
          status.innerHTML = `✅ Location captured: <strong style="color:var(--accent-green);">${lat}, ${lng}</strong>`;
          geoBtn.textContent = '✅ Detected';
          geoBtn.disabled = true;
        },
        (err) => {
          status.textContent = `⚠️ Could not detect location: ${err.message}. You may still submit.`;
        }
      );
    });
  }

  // Complaint form submit
  const form = document.getElementById('complaint-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear errors
      ['cid-err','area-err','type-err','desc-err'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.remove('show'); }
      });

      const consumerId   = document.getElementById('c-consumerId').value.trim();
      const areaName     = document.getElementById('c-areaName').value.trim();
      const problemType  = document.getElementById('c-problemType').value;
      const description  = document.getElementById('c-description').value.trim();
      const lat          = document.getElementById('c-lat').value;
      const lng          = document.getElementById('c-lng').value;

      let valid = true;
      const setErr = (id, msg) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.classList.add('show'); }
        valid = false;
      };

      if (!consumerId)  setErr('cid-err',  'Consumer ID is required.');
      if (!areaName)    setErr('area-err', 'Area name is required.');
      if (!problemType) setErr('type-err', 'Please select a problem type.');
      if (!description) setErr('desc-err', 'Description is required.');
      if (!valid) return;

      const btn = document.getElementById('complaint-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Submitting…';

      try {
        const payload = { consumerId, areaName, problemType, description };
        if (lat && lng) payload.location = { lat: parseFloat(lat), lng: parseFloat(lng) };

        const res = await apiFetch('/complaints', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (!res) return;
        if (res.ok) {
          triggerCircuitGlow();
          // Pop-up message as requested
          alert(`NOTE: This Tracking ID is ${res.data.complaint.trackingId}. Please save it for any future details.`);
          
          // Show success card
          document.getElementById('complaint-section').style.display = 'none';
          document.getElementById('success-card').style.display       = 'block';
          document.getElementById('tracking-id-display').textContent  = res.data.complaint.trackingId;
          showToast('Complaint filed successfully!', 'success');
          loadMyComplaints();
        } else {
          showToast(res.data.message || 'Failed to submit complaint.', 'error');
        }
      } catch {
        showToast('Network error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Submit Complaint';
      }
    });
  }

  loadMyComplaints();
});

// ── Load user's previous complaints ──────────────────────────────────────────
async function loadMyComplaints() {
  if (!isLoggedIn()) return;
  const section = document.getElementById('my-complaints-section');
  const list    = document.getElementById('my-complaints-list');
  if (!section || !list) return;

  try {
    const res = await apiFetch('/complaints/my');
    if (!res || !res.ok) return;

    const { complaints = [], resolved = [] } = res.data;
    const all = [...complaints, ...resolved].sort((a, b) => new Date(b.createdAt || b.resolvedAt) - new Date(a.createdAt || a.resolvedAt));

    section.style.display = 'block';
    if (all.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);">No complaints filed yet.</p>';
      return;
    }

    list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Tracking ID</th><th>Area</th><th>Problem</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${all.map(c => `
              <tr>
                <td><code style="color:var(--accent-yellow);font-size:0.85rem;">${c.trackingId}</code></td>
                <td>${c.areaName}</td>
                <td style="text-transform:capitalize;">${c.problemType}</td>
                <td>${badgeHtml(c.status)}${c.escalated ? ' <span class="badge badge-escalated">Escalated</span>' : ''}</td>
                <td>${new Date(c.createdAt || c.resolvedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {}
}

function badgeHtml(status) {
  const map = { pending: 'badge-pending', 'in-progress': 'badge-progress', resolved: 'badge-resolved' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}
