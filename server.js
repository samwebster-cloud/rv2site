require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const roles = require('./lib/rolesStore');
const { sendApplicationEmail } = require('./lib/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);
    cb(ok ? null : new Error('CV must be a PDF or Word document'), ok);
  },
});

app.use(helmet({
  contentSecurityPolicy: false, // pages use a couple of inline handlers; tighten if you add a build step
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hour session
    secure: process.env.NODE_ENV === 'production',
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth helpers ----------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  return res.redirect('/admin/login.html');
}

// ---------- Public roles API ----------
app.get('/api/roles', (req, res) => {
  res.json(roles.getActiveRoles());
});

app.get('/api/roles/:id', (req, res) => {
  const role = roles.getRoleById(req.params.id);
  if (!role || !role.active) return res.status(404).json({ error: 'Role not found' });
  res.json(role);
});

// ---------- Application submission ----------
app.post('/api/apply', upload.single('cv'), async (req, res) => {
  try {
    const { roleId, name, email, phone, message } = req.body;
    if (!roleId || !name || !email) {
      return res.status(400).json({ error: 'Role, name and email are required.' });
    }
    const role = roles.getRoleById(roleId);
    if (!role) return res.status(404).json({ error: 'That role could not be found. It may have closed.' });

    const result = await sendApplicationEmail({
      role, name, email, phone, message, attachment: req.file,
    });
    res.json({ ok: true, delivered: result.delivered });
  } catch (err) {
    console.error('Application error:', err);
    res.status(500).json({ error: 'Something went wrong sending your application. Please try again.' });
  }
});

// ---------- Admin auth ----------
app.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return res.status(500).json({ error: 'Admin password not configured on the server yet.' });
  }
  const ok = password && await bcrypt.compare(password, hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password.' });
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/admin/session', (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

// ---------- Admin roles API (protected) ----------
app.get('/api/admin/roles', requireAdmin, (req, res) => {
  res.json(roles.getAllRoles());
});

app.post('/api/admin/roles', requireAdmin, async (req, res) => {
  const { title, contract, location, employmentType, salary, summary, description, active } = req.body;
  if (!title || !contract || !location || !employmentType || !summary) {
    return res.status(400).json({ error: 'Title, contract, location, employment type and summary are required.' });
  }
  const role = await roles.createRole({ title, contract, location, employmentType, salary, summary, description, active });
  res.status(201).json(role);
});

app.put('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  const updated = await roles.updateRole(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Role not found' });
  res.json(updated);
});

app.delete('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  const ok = await roles.deleteRole(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Role not found' });
  res.json({ ok: true });
});

// Admin dashboard page itself is gated (login page stays public)
app.get('/admin/dashboard.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`RV2 Energy site running on http://localhost:${PORT}`);
});
