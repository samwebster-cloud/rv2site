const roleList = document.getElementById('roleList');
const gauge = document.getElementById('gauge');
const overlay = document.getElementById('applyOverlay');
const form = document.getElementById('applyForm');
const formMsg = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');

let roles = [];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderRoles() {
  if (roles.length === 0) {
    gauge.innerHTML = '<span class="gauge-dot" style="background:#3a4551; box-shadow:none;"></span> No live roles right now';
    roleList.innerHTML = `<div class="empty-state">
      <h3 style="text-transform:none; font-family:var(--font-body); font-weight:700;">Nothing open at the moment</h3>
      <p>Check back soon, or send a speculative CV to <a href="mailto:careers@rv2energy.co.uk">careers@rv2energy.co.uk</a> and we'll keep it on file.</p>
    </div>`;
    return;
  }

  gauge.innerHTML = `<span class="gauge-dot"></span> ${roles.length} live role${roles.length === 1 ? '' : 's'}`;

  roleList.innerHTML = roles.map(r => `
    <div class="role-card">
      <div>
        <h3 style="font-size:1.3rem; text-transform:none; font-family:var(--font-body); font-weight:700;">${escapeHtml(r.title)}</h3>
        <p style="margin:8px 0 0;">${escapeHtml(r.summary)}</p>
        <div class="role-meta">
          <span class="tag contract">${escapeHtml(r.contract)}</span>
          <span class="tag">${escapeHtml(r.location)}</span>
          <span class="tag">${escapeHtml(r.employmentType)}</span>
          ${r.salary ? `<span class="tag">${escapeHtml(r.salary)}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-primary apply-btn" data-id="${r.id}">Apply now</button>
    </div>
  `).join('');

  document.querySelectorAll('.apply-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
  });
}

async function loadRoles() {
  try {
    const res = await fetch('/api/roles');
    roles = await res.json();
    renderRoles();
  } catch (err) {
    gauge.textContent = 'Could not load roles — please refresh.';
  }
}

function openModal(roleId) {
  const role = roles.find(r => r.id === roleId);
  if (!role) return;
  document.getElementById('roleId').value = role.id;
  document.getElementById('modalRoleTitle').textContent = role.title;
  document.getElementById('modalRoleContract').textContent = `${role.contract} · ${role.location}`;
  formMsg.className = 'form-msg';
  formMsg.textContent = '';
  form.reset();
  document.getElementById('roleId').value = role.id;
  overlay.classList.add('open');
}

function closeModal() {
  overlay.classList.remove('open');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formMsg.className = 'form-msg';

  try {
    const data = new FormData(form);
    const res = await fetch('/api/apply', { method: 'POST', body: data });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Something went wrong.');

    formMsg.textContent = "Thanks — your application has been sent. We'll be in touch.";
    formMsg.className = 'form-msg success show';
    form.reset();
    setTimeout(closeModal, 2200);
  } catch (err) {
    formMsg.textContent = err.message || 'Something went wrong sending your application. Please try again.';
    formMsg.className = 'form-msg error show';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit application';
  }
});

loadRoles();
