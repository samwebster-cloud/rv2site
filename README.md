# RV2 Energy website

A four-page marketing site with a working careers board:

- **Home** — hero, stats, business overview
- **Careers** (`careers.html`) — live roles pulled from a small data file, with an
  application form that emails candidates straight to your inbox
- **Upskill** (`upskill.html`) — training/accreditation programme page
- **Our Businesses** (`businesses.html`) — RV2 Power, Civils, and ICP
- **Admin dashboard** (`/admin/login.html`) — password-protected page to add,
  edit, hide, or delete live roles without touching any code

This is a small Node.js app, not a static site — it needs to run on a server
(or a host like Render/Railway) rather than being dropped onto plain file
hosting, because the careers form and admin panel both need a backend.

## 1. Local setup

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `SESSION_SECRET` — any long random string
- `ADMIN_PASSWORD_HASH` — generate with:
  ```bash
  node scripts/hash-password.js "your-chosen-password"
  ```
  Copy the printed hash into `.env`.
- SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `APPLICATIONS_INBOX`, `MAIL_FROM`) — see below.

Then run:

```bash
npm start
```

Visit `http://localhost:3000`.

**Note:** if you leave the SMTP settings blank, the site still works —
applications just get logged to the server console instead of emailed,
so you can test the whole flow before setting up real email credentials.

## 2. Setting up email

Any SMTP provider works. Two easy options:

**Gmail / Google Workspace** — create an
[App Password](https://myaccount.google.com/apppasswords) for the account
you want to send from, then:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@yourdomain.co.uk
SMTP_PASS=your-16-character-app-password
```

**A transactional email service** (SendGrid, Postmark, etc.) — sign up,
grab their SMTP credentials, and drop them into the same four fields.
These are more reliable for higher volumes than a personal Gmail account.

`APPLICATIONS_INBOX` is where every application lands — set it to whichever
inbox your recruitment team actually checks.

## 3. Managing live roles

Go to `/admin/login.html`, sign in with the password you set, and you can
add, edit, hide, or delete roles. Changes appear on the careers page
immediately — no redeploy needed. Roles are stored in `data/roles.json`.

## 4. Deploying

The simplest path is **Render** (free tier available) or **Railway**:

1. Push this project to a GitHub repo (add a `.gitignore` excluding
   `node_modules` and `.env` — see below).
2. On Render: New → Web Service → connect the repo.
   - Build command: `npm install`
   - Start command: `npm start`
3. Add all the variables from `.env` under the service's Environment
   settings (never commit `.env` itself).
4. Once deployed, point your domain's DNS at the Render URL.

Add a `.gitignore`:

```
node_modules/
.env
```

## 5. Branding

Your real logo and brand colours are already wired in:

- **Colours** are set once, as CSS variables at the top of
  `public/css/style.css`, matched exactly to your logo (`#46c0b7` teal,
  `#26292c` ink). Change these two if the brand ever updates and the
  whole site follows.
- **Logo** files live in `public/images/` at several sizes
  (`logo-512.png` down to `favicon-32.png`), rendered from your supplied
  EPS master file. It's used in the header, the admin bar, and as the
  site favicon.
- If you get an updated logo file in future (EPS, AI, or PDF), send it
  over and I'll re-render the full set the same way.

## Limitations to know about

- **Storage**: roles are stored in a JSON file, which is fine for a small
  team managing a handful of roles at a time. If you ever need multiple
  admins editing simultaneously at scale, that'd be the point to move to a
  real database.
- **CV uploads**: attached CVs are emailed directly and not stored on the
  server — there's no separate CV archive to manage or secure.
- **Single admin password**: there's one shared password rather than
  individual logins. Fine for a small team; let me know if you'd want
  per-user accounts later.
