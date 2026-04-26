/* ===================================================
   status.js – Track complaint by Tracking ID
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill from URL param e.g. status.html?id=TRK-XXXXXXXX
  const params = new URLSearchParams(window.location.search);
  const preId  = params.get('id');
  if (preId) {
    const inp = document.getElementById('track-input');
    if (inp) { inp.value = preId.toUpperCase(); }
    doTrack(preId.toUpperCase());
  }

  const form = document.getElementById('track-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('track-input').value.trim().toUpperCase();
      if (!id) { showToast('Please enter a Tracking ID.', 'error'); return; }
      doTrack(id);
    });
  }
});

async function doTrack(trackingId) {
  const resultEl = document.getElementById('track-result');
  const btn      = document.getElementById('track-btn');
  if (!resultEl) return;

  resultEl.innerHTML = '<div class="spinner"></div>';
  resultEl.style.display = 'block';
  if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }

  try {
    const res = await apiFetch(`/complaints/track/${trackingId}`);
    if (!res) return;

    if (res.ok) {
      triggerCircuitGlow();
      const c = res.data.complaint;
      const statusMap = {
        pending:       { cls: 'badge-pending',  label: '⏳ Pending' },
        'in-progress': { cls: 'badge-progress', label: '🔧 In Progress' },
        resolved:      { cls: 'badge-resolved', label: '✅ Resolved' },
      };
      const st = statusMap[c.status] || { cls: '', label: c.status };
      const locLink = c.location?.lat
        ? `<a href="https://www.google.com/maps?q=${c.location.lat},${c.location.lng}" target="_blank"
             style="color:var(--accent-blue);font-size:0.85rem;">📍 View on Google Maps</a>`
        : '<span style="color:var(--text-dim);font-size:0.85rem;">Location not available</span>';

      resultEl.innerHTML = `
        <div class="card" style="border-color:${c.status==='resolved'?'rgba(0,230,118,0.4)':'var(--border-glow)'};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Tracking ID</div>
              <div style="font-family:var(--font-display);font-size:1.3rem;color:var(--accent-yellow);letter-spacing:2px;">${c.trackingId}</div>
            </div>
            <span class="badge ${st.cls}" style="font-size:0.85rem;padding:0.5rem 1rem;">${st.label}</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Consumer ID</div>
              <div style="color:var(--text-primary);">${c.consumerId}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Area</div>
              <div style="color:var(--text-primary);">${c.areaName}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Problem Type</div>
              <div style="color:var(--text-primary);text-transform:capitalize;">${c.problemType}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Filed On</div>
              <div style="color:var(--text-primary);">${new Date(c.createdAt).toLocaleString()}</div>
            </div>
            ${c.resolvedAt ? `
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Resolved On</div>
              <div style="color:var(--accent-green);">${new Date(c.resolvedAt).toLocaleString()}</div>
            </div>` : ''}
            ${c.escalated ? `<div><span class="badge badge-escalated">⚠️ Escalated</span></div>` : ''}
          </div>

          <div style="margin-top:1rem;">
            <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.25rem;">Description</div>
            <div style="color:var(--text-primary);font-size:0.9rem;line-height:1.6;">${c.description}</div>
          </div>

          ${c.adminNote ? `
          <div style="margin-top:1rem;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:0.75rem;">
            <div style="font-size:0.72rem;color:var(--accent-blue);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.25rem;">Admin Note</div>
            <div style="color:var(--text-primary);font-size:0.88rem;">${c.adminNote}</div>
          </div>` : ''}

          <div style="margin-top:1.25rem;">${locLink}</div>
        </div>`;
    } else {
      resultEl.innerHTML = `
        <div class="card" style="text-align:center;border-color:rgba(255,68,68,0.3);">
          <div style="font-size:2.5rem;margin-bottom:0.75rem;">🔎</div>
          <h3 style="color:var(--accent-red);margin-bottom:0.5rem;">Not Found</h3>
          <p style="color:var(--text-muted);">${res.data.message || 'No complaint found with that ID.'}</p>
        </div>`;
    }
  } catch {
    resultEl.innerHTML = '<p style="color:var(--accent-red);">Network error. Please try again.</p>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Track'; }
  }
}
