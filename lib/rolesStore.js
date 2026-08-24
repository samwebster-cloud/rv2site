const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'roles.json');

// Very small write queue so two admin edits landing at the same instant
// can't clobber each other. Fine for a small-team admin panel; if this
// ever needs to handle real concurrent traffic, swap this file for a
// proper database.
let writeChain = Promise.resolve();

function readAll() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeAll(roles) {
  writeChain = writeChain.then(
    () => fs.promises.writeFile(DATA_PATH, JSON.stringify(roles, null, 2), 'utf8')
  );
  return writeChain;
}

function genId() {
  return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = {
  getAllRoles() {
    return readAll();
  },
  getActiveRoles() {
    return readAll().filter(r => r.active);
  },
  getRoleById(id) {
    return readAll().find(r => r.id === id) || null;
  },
  async createRole(data) {
    const roles = readAll();
    const role = {
      id: genId(),
      title: data.title,
      contract: data.contract,
      location: data.location,
      employmentType: data.employmentType,
      salary: data.salary || '',
      summary: data.summary,
      description: data.description || '',
      postedDate: new Date().toISOString().slice(0, 10),
      active: data.active !== false,
    };
    roles.unshift(role);
    await writeAll(roles);
    return role;
  },
  async updateRole(id, data) {
    const roles = readAll();
    const idx = roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    roles[idx] = { ...roles[idx], ...data, id };
    await writeAll(roles);
    return roles[idx];
  },
  async deleteRole(id) {
    const roles = readAll();
    const next = roles.filter(r => r.id !== id);
    const changed = next.length !== roles.length;
    if (changed) await writeAll(next);
    return changed;
  },
};
