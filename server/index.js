import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import express from 'express'
import session from 'express-session'
import db from './db.js'
import { hashPassword, verifyPassword } from './auth.js'
import { findOrCreateProperty } from './properties.js'
import { createInvoice, createPayment } from './invoices.js'
import { getStripe } from './stripe.js'
import { sendInvoiceEmail } from './email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Needed so express-session can tell over HTTPS vs HTTP when this sits
// behind a host's reverse proxy (Railway, Render, etc.) - without it,
// "secure: auto" cookies never get marked secure and browsers may
// refuse them on a real deployment.
app.set('trust proxy', 1)

// Stripe's webhook signature check needs the raw, unparsed request body,
// so this route (and its own express.raw() parser) has to be registered
// before the blanket express.json() below - once that's run, the raw
// bytes are gone and signature verification always fails.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const stripe = getStripe()
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).end()
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET,
      )
    } catch (err) {
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`)
    }

    if (event.type === 'checkout.session.completed') {
      const contactId = event.data.object.metadata?.contactId
      const existing = contactId
        ? db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId)
        : null
      if (existing) {
        const updated = rowToContact(existing)
        updated.stage = 'paid'
        applyInvoiceAndPayment(updated)
        // Distinguish an online payment from one the business owner
        // enters by hand, without needing them to type it in - the
        // whole point of this endpoint is updating the CRM with no
        // manual step.
        if (!updated.payment.method) {
          updated.payment.method = 'Online payment (Stripe)'
        }
        db.prepare('UPDATE contacts SET stage = ?, invoice = ?, payment = ? WHERE id = ?').run(
          updated.stage,
          JSON.stringify(updated.invoice),
          JSON.stringify(updated.payment),
          contactId,
        )
      }
    }

    res.json({ received: true })
  },
)

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
    propertyId: row.propertyId ?? null,
    createdAt: row.createdAt ?? null,
    invoice: row.invoice ? JSON.parse(row.invoice) : null,
    payment: row.payment ? JSON.parse(row.payment) : null,
  }
}

// Mutates and returns `contact`: generates an invoice the first time its
// stage reaches "invoiced" (or skips straight to "paid"), and a payment
// the first time it reaches "paid" - each only ever created once per
// contact, never regenerated on a later save.
function applyInvoiceAndPayment(contact) {
  if ((contact.stage === 'invoiced' || contact.stage === 'paid') && !contact.invoice) {
    contact.invoice = createInvoice(db)
  }
  if (contact.stage === 'paid' && !contact.payment) {
    contact.payment = createPayment(contact.quote?.total ?? 0)
  }
  return contact
}

function payLinkFor(req, contact) {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
  return `${origin}/pay/${contact.invoice.payToken}`
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
  const c = { invoice: null, payment: null, ...req.body }
  const propertyId = findOrCreateProperty(db, c.address)
  const createdAt = new Date().toISOString()
  applyInvoiceAndPayment(c)
  db.prepare(`
    INSERT INTO contacts (id, name, phone, email, address, services, measurements, stage, scheduledAt, quote, propertyId, createdAt, invoice, payment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    propertyId,
    createdAt,
    c.invoice ? JSON.stringify(c.invoice) : null,
    c.payment ? JSON.stringify(c.payment) : null,
  )
  res.status(201).json({ ...c, propertyId, createdAt })
})

app.put('/api/contacts/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const hadInvoiceBefore = Boolean(existing.invoice)
  const updated = { ...rowToContact(existing), ...req.body }
  // Re-resolve every save, not just when address is the field being
  // changed - if the address changed, this relinks the job to the
  // right property (existing or new); if it didn't, findOrCreateProperty
  // just returns the same property id it already had.
  updated.propertyId = findOrCreateProperty(db, updated.address)
  applyInvoiceAndPayment(updated)
  db.prepare(`
    UPDATE contacts
    SET name = ?, phone = ?, email = ?, address = ?, services = ?, measurements = ?, stage = ?, scheduledAt = ?, quote = ?, propertyId = ?, invoice = ?, payment = ?
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
    updated.propertyId,
    updated.invoice ? JSON.stringify(updated.invoice) : null,
    updated.payment ? JSON.stringify(updated.payment) : null,
    req.params.id,
  )
  res.json(updated)

  // Fire-and-forget, after the response is already sent: an invoice
  // just came into existence on this save, so email it automatically.
  // A slow or misconfigured email provider should never delay or fail
  // the actual data save above, which is what matters.
  if (!hadInvoiceBefore && updated.invoice && updated.email) {
    sendInvoiceEmail(updated, payLinkFor(req, updated)).catch((err) =>
      console.error('Auto-send invoice email failed:', err),
    )
  }
})

app.post('/api/contacts/:id/send-invoice-email', requireAuth, async (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const contact = rowToContact(existing)
  if (!contact.invoice) {
    return res.status(400).json({ error: 'This job has no invoice yet.' })
  }
  const result = await sendInvoiceEmail(contact, payLinkFor(req, contact))
  if (!result.sent) {
    const messages = {
      'not-configured': 'Email sending is not set up yet (missing RESEND_API_KEY).',
      'no-email': 'This contact has no email address on file.',
      'send-failed': `Failed to send: ${result.message}`,
    }
    return res.status(400).json({ error: messages[result.reason] || 'Failed to send email.' })
  }
  res.json({ sent: true })
})

app.delete('/api/contacts/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// --- Public payment page (no auth - the customer isn't a CRM user) ---
// Looked up by the invoice's payToken, a 192-bit random value, never by
// the sequential invoice number or contact id, so a link can't be
// guessed from another one.

function findContactRowByPayToken(token) {
  const rows = db.prepare('SELECT * FROM contacts WHERE invoice IS NOT NULL').all()
  return rows.find((row) => JSON.parse(row.invoice).payToken === token) ?? null
}

app.get('/api/pay/:token', (req, res) => {
  const row = findContactRowByPayToken(req.params.token)
  if (!row) return res.status(404).json({ error: 'Invoice not found' })
  const contact = rowToContact(row)
  res.json({
    name: contact.name,
    address: contact.address,
    quote: contact.quote,
    invoice: {
      number: contact.invoice.number,
      issueDate: contact.invoice.issueDate,
      dueDate: contact.invoice.dueDate,
    },
    isPaid: contact.stage === 'paid',
  })
})

app.post('/api/pay/:token/checkout', async (req, res) => {
  const stripe = getStripe()
  if (!stripe) {
    return res.status(503).json({
      error: "Online payment isn't set up yet - contact the business directly to pay.",
    })
  }
  const row = findContactRowByPayToken(req.params.token)
  if (!row) return res.status(404).json({ error: 'Invoice not found' })
  const contact = rowToContact(row)
  if (contact.stage === 'paid') {
    return res.status(400).json({ error: 'This invoice has already been paid.' })
  }

  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(contact.quote.total * 100),
            product_data: { name: `Invoice ${contact.invoice.number}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/pay/${req.params.token}?paid=1`,
      cancel_url: `${origin}/pay/${req.params.token}`,
      metadata: { contactId: contact.id },
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(502).json({ error: `Couldn't start checkout: ${err.message}` })
  }
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
