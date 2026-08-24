const tbody = document.getElementById('rolesTableBody');
const overlay = document.getElementById('editorOverlay');
const form = document.getElementById('roleForm');
const editorMsg = document.getElementById('editorMsg');
const editorTitle = document.getElementById('editorTitle');
const saveBtn = document.getElementById('saveBtn');

let roles = [];
let editingId = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function loadRoles() {
  const res = await fetch('/api/admin/roles');
  if (res.status === 401) return (window.location.href = '/admin/login.html');
  roles = await res.json();
  renderTable();
}

function renderTable() {
  if (roles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No roles yet — add your first one.</td></tr>';
    return;
  }
  tbody.innerHTML = roles.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.title)}</strong><br><span style="color:var(--steel); font-size:0.85rem;">${escapeHtml(r.summary)}</span></td>
      <td>${escapeHtml(r.contract)}</td>
      <td>${escapeHtml(r.location)}</td>
      <td><span class="status-pill ${r.active ? 'active' : 'inactive'}">${r.active ? 'Live' : 'Hidden'}</span></td>
      <td>${escapeHtml(r.postedDate)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline edit-btn" data-id="${r.id}">Edit</button>
          <button class="btn btn-outline toggle-btn" data-id="${r.id}">${r.active ? 'Hide' : 'Show'}</button>
          <button class="btn btn-danger delete-btn" data-id="${r.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.id)));
  document.querySelectorAll('.toggle-btn').forEach(b => b.addEventListener('click', () => toggleActive(b.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', () => deleteRole(b.dataset.id)));
}

function openEditor(id) {
  editingId = id || null;
  editorMsg.className = 'form-msg';
  form.reset();
  document.getElementById('active').checked = true;

  if (id) {
    const role = roles.find(r => r.id === id);
    editorTitle.textContent = 'Edit role';
    document.getElementById('roleId').value = role.id;
    document.getElementById('title').value = role.title;
    document.getElementById('contract').value = role.contract;
    document.getElementById('employmentType').value = role.employmentType;
    document.getElementById('location').value = role.location;
    document.getElementById('salary').value = role.salary || '';
    document.getElementById('summary').value = role.summary;
    document.getElementById('description').value = role.description || '';
    document.getElementById('active').checked = role.active;
  } else {
    editorTitle.textContent = 'Add a role';
    document.getElementById('roleId').value = '';
  }
  overlay.classList.add('open');
}

function closeEditor() {
  overlay.classList.remove('open');
}

async function toggleActive(id) {
  const role = roles.find(r => r.id === id);
  await fetch(`/api/admin/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !role.active }),
  });
  loadRoles();
}

async function deleteRole(id) {
  const role = roles.find(r => r.id === id);
  if (!confirm(`Delete "${role.title}"? This can't be undone.`)) return;
  await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
  loadRoles();
}

document.getElementById('newRoleBtn').addEventListener('click', () => openEditor(null));
document.getElementById('closeEditor').addEventListener('click', closeEditor);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEditor(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const payload = {
    title: document.getElementById('title').value,
    contract: document.getElementById('contract').value,
    employmentType: document.getElementById('employmentType').value,
    location: document.getElementById('location').value,
    salary: document.getElementById('salary').value,
    summary: document.getElementById('summary').value,
    description: document.getElementById('description').value,
    active: document.getElementById('active').checked,
  };

  try {
    const id = document.getElementById('roleId').value;
    const res = await fetch(id ? `/api/admin/roles/${id}` : '/api/admin/roles', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Could not save role.');

    closeEditor();
    loadRoles();
  } catch (err) {
    editorMsg.textContent = err.message;
    editorMsg.className = 'form-msg error show';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save role';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

loadRoles();
