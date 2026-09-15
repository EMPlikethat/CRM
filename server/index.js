import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import express from 'express'
import session from 'express-session'
import db from './db.js'
import { hashPassword, verifyPassword } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Needed so express-session can tell over HTTPS vs HTTP when this sits
// behind a host's reverse proxy (Railway, Render, etc.) - without it,
// "secure: auto" cookies never get marked secure and browsers may
// refuse them on a real deployment.
app.set('trust proxy', 1)

app.use(express.json())

if (!process.env.SESSION_SECRET) {
  console.warn(
    'WARNING: SESSION_SECRET is not set. Using an insecure default - ' +
      'fine for local dev, but set a real SESSION_SECRET before deploying.',
  )
}

app.use(
  session({
    name: 'mch_crm_session',
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
)

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' })
  }
  next()
}

function rowToService(row) {
  return { id: row.id, label: row.label, pricing: JSON.parse(row.pricing) }
}

function rowToContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    services: JSON.parse(row.services),
    measurements: JSON.parse(row.measurements),
    stage: row.stage,
    scheduledAt: row.scheduledAt ?? '',
    quote: row.quote ? JSON.parse(row.quote) : null,
  }
}

// --- Auth ---
// Single-admin bootstrap: /api/auth/setup only works while the users
// table is empty. After the first account is created, that door closes
// and only /api/auth/login works - there's no open registration.

app.get('/api/auth/status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  res.json({
    authenticated: Boolean(req.session.userId),
    needsSetup: userCount === 0,
  })
})

app.post('/api/auth/setup', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  if (userCount > 0) {
    return res.status(403).json({ error: 'Setup already completed' })
  }
  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Email and an 8+ character password are required' })
  }
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO users (id, email, passwordHash) VALUES (?, ?, ?)').run(
    id,
    email.toLowerCase(),
    hashPassword(password),
  )
  req.session.userId = id
  res.status(201).json({ email: email.toLowerCase() })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get((email ?? '').toLowerCase())
  if (!user || !verifyPassword(password ?? '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  req.session.userId = user.id
  res.json({ email: user.email })
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(204).end()
  })
})

// --- Services (all require sign-in) ---

app.get('/api/services', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM services').all()
  res.json(rows.map(rowToService))
})

app.post('/api/services', requireAuth, (req, res) => {
  const { id, label, pricing } = req.body
  db.prepare('INSERT INTO services (id, label, pricing) VALUES (?, ?, ?)').run(
    id,
    label,
    JSON.stringify(pricing),
  )
  res.status(201).json({ id, label, pricing })
})

app.put('/api/services/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = { ...rowToService(existing), ...req.body }
  db.prepare('UPDATE services SET label = ?, pricing = ? WHERE id = ?').run(
    updated.label,
    JSON.stringify(updated.pricing),
    req.params.id,
  )
  res.json(updated)
})

app.delete('/api/services/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// --- Contacts (all require sign-in) ---

app.get('/api/contacts', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts').all()
  res.json(rows.map(rowToContact))
})

app.post('/api/contacts', requireAuth, (req, res) => {
  const c = req.body
  db.prepare(`
    INSERT INTO contacts (id, name, phone, email, address, services, measurements, stage, scheduledAt, quote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    c.id,
    c.name,
    c.phone ?? '',
    c.email ?? '',
    c.address ?? '',
    JSON.stringify(c.services ?? []),
    JSON.stringify(c.measurements ?? {}),
    c.stage,
    c.scheduledAt ?? '',
    c.quote ? JSON.stringify(c.quote) : null,
  )
  res.status(201).json(c)
})

app.put('/api/contacts/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = { ...rowToContact(existing), ...req.body }
  db.prepare(`
    UPDATE contacts
    SET name = ?, phone = ?, email = ?, address = ?, services = ?, measurements = ?, stage = ?, scheduledAt = ?, quote = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.phone,
    updated.email,
    updated.address,
    JSON.stringify(updated.services),
    JSON.stringify(updated.measurements),
    updated.stage,
    updated.scheduledAt,
    updated.quote ? JSON.stringify(updated.quote) : null,
    req.params.id,
  )
  res.json(updated)
})

app.delete('/api/contacts/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// In production there's no separate Vite dev server, so this same
// process also serves the built frontend - one deployed service
// instead of two.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist')
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
