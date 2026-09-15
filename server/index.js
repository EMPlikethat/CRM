import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import express from 'express'
import session from 'express-session'
import multer from 'multer'
import db from './db.js'
import { hashPassword, verifyPassword } from './auth.js'
import { findOrCreateProperty } from './properties.js'
import { geocodeAddress } from './geocode.js'
import { createInvoice, createPayment } from './invoices.js'
import { getStripe } from './stripe.js'
import { sendInvoiceEmail } from './email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Where uploaded job photos land on disk. Not committed to git (see
// .gitignore) and, on most hosts, not persisted across deploys unless
// you attach a real volume - see the Photos note in the README.
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Only image files can be uploaded'))
    }
    cb(null, true)
  },
})

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

// Job photos - gated the same as every other CRM route. A browser
// sends the session cookie automatically on a same-origin <img src>,
// so this works as a plain <img> tag with no extra fetch/blob dance.
app.use('/uploads', requireAuth, express.static(uploadsDir))

function rowToService(row) {
  return { id: row.id, label: row.label, pricing: JSON.parse(row.pricing) }
}

function rowToExpense(row) {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    category: row.category,
    date: row.date,
    contactId: row.contactId ?? null,
  }
}

function rowToProperty(row) {
  return {
    id: row.id,
    address: row.address,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  }
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
    notes: row.notes ? JSON.parse(row.notes) : [],
    followUps: row.followUps ? JSON.parse(row.followUps) : [],
    photos: row.photos ? JSON.parse(row.photos) : [],
  }
}

function getContactOrNull(id) {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id)
  return row ? rowToContact(row) : null
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

// --- Expenses (all require sign-in) ---

app.get('/api/expenses', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all()
  res.json(rows.map(rowToExpense))
})

app.post('/api/expenses', requireAuth, (req, res) => {
  const { description, amount, category, date, contactId } = req.body
  if (!description || !amount || !category || !date) {
    return res
      .status(400)
      .json({ error: 'Description, amount, category, and date are required' })
  }
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO expenses (id, description, amount, category, date, contactId)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, description, Number(amount), category, date, contactId || null)
  res.status(201).json({ id, description, amount: Number(amount), category, date, contactId: contactId || null })
})

app.put('/api/expenses/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = { ...rowToExpense(existing), ...req.body }
  db.prepare(`
    UPDATE expenses SET description = ?, amount = ?, category = ?, date = ?, contactId = ?
    WHERE id = ?
  `).run(
    updated.description,
    Number(updated.amount),
    updated.category,
    updated.date,
    updated.contactId || null,
    req.params.id,
  )
  res.json(updated)
})

app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// --- Properties (all require sign-in) ---
// Properties themselves are only ever created as a side effect of saving
// a contact (see findOrCreateProperty) - there's no create/edit route
// here, just reading them (for the Map) and retrying a failed geocode.

app.get('/api/properties', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM properties').all()
  res.json(rows.map(rowToProperty))
})

app.post('/api/properties/:id/geocode', requireAuth, async (req, res) => {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const result = await geocodeAddress(row.address)
  if (!result) {
    return res.status(502).json({
      error: "Couldn't locate that address - check it's spelled correctly and try again",
    })
  }
  db.prepare('UPDATE properties SET lat = ?, lng = ? WHERE id = ?').run(
    result.lat,
    result.lng,
    req.params.id,
  )
  res.json(rowToProperty({ ...row, lat: result.lat, lng: result.lng }))
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

// --- Notes & follow-ups ---
// Dedicated endpoints rather than going through the general contact
// PUT: adding a note or checking off a follow-up is a quick, standalone
// action, not something that should wait on (or risk being lost with)
// an unrelated edit-form save.

function saveNotesAndFollowUps(id, notes, followUps) {
  db.prepare('UPDATE contacts SET notes = ?, followUps = ? WHERE id = ?').run(
    JSON.stringify(notes),
    JSON.stringify(followUps),
    id,
  )
}

app.post('/api/contacts/:id/notes', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const text = (req.body.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'Note text is required' })
  const notes = [...contact.notes, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }]
  saveNotesAndFollowUps(req.params.id, notes, contact.followUps)
  res.status(201).json({ ...contact, notes })
})

app.delete('/api/contacts/:id/notes/:noteId', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const notes = contact.notes.filter((n) => n.id !== req.params.noteId)
  saveNotesAndFollowUps(req.params.id, notes, contact.followUps)
  res.json({ ...contact, notes })
})

app.post('/api/contacts/:id/follow-ups', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const text = (req.body.text ?? '').trim()
  const dueDate = req.body.dueDate ?? ''
  if (!text || !dueDate) {
    return res.status(400).json({ error: 'Follow-up text and due date are required' })
  }
  const followUps = [
    ...contact.followUps,
    { id: crypto.randomUUID(), text, dueDate, done: false, createdAt: new Date().toISOString() },
  ]
  saveNotesAndFollowUps(req.params.id, contact.notes, followUps)
  res.status(201).json({ ...contact, followUps })
})

app.put('/api/contacts/:id/follow-ups/:followUpId', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const followUps = contact.followUps.map((f) =>
    f.id === req.params.followUpId ? { ...f, ...req.body } : f,
  )
  saveNotesAndFollowUps(req.params.id, contact.notes, followUps)
  res.json({ ...contact, followUps })
})

app.delete('/api/contacts/:id/follow-ups/:followUpId', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const followUps = contact.followUps.filter((f) => f.id !== req.params.followUpId)
  saveNotesAndFollowUps(req.params.id, contact.notes, followUps)
  res.json({ ...contact, followUps })
})

function savePhotos(id, photos) {
  db.prepare('UPDATE contacts SET photos = ? WHERE id = ?').run(JSON.stringify(photos), id)
}

app.post('/api/contacts/:id/photos', requireAuth, (req, res) => {
  // multer errors (bad file type, over the size limit) are handled here
  // rather than through Express's global error handler, so this route
  // can turn them into a normal JSON error response.
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    const contact = getContactOrNull(req.params.id)
    if (!contact) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(404).json({ error: 'Not found' })
    }
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' })
    const photos = [
      ...contact.photos,
      {
        id: crypto.randomUUID(),
        filename: req.file.filename,
        caption: (req.body.caption ?? '').trim(),
        createdAt: new Date().toISOString(),
      },
    ]
    savePhotos(req.params.id, photos)
    res.status(201).json({ ...contact, photos })
  })
})

app.delete('/api/contacts/:id/photos/:photoId', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const photo = contact.photos.find((p) => p.id === req.params.photoId)
  const photos = contact.photos.filter((p) => p.id !== req.params.photoId)
  if (photo) fs.unlink(path.join(uploadsDir, photo.filename), () => {})
  savePhotos(req.params.id, photos)
  res.json({ ...contact, photos })
})

app.delete('/api/contacts/:id', requireAuth, (req, res) => {
  const contact = getContactOrNull(req.params.id)
  if (contact) {
    for (const photo of contact.photos) {
      fs.unlink(path.join(uploadsDir, photo.filename), () => {})
    }
  }
  // Expenses logged against this job outlive it as general records - just
  // unlink them rather than deleting real spending history.
  db.prepare('UPDATE expenses SET contactId = NULL WHERE contactId = ?').run(req.params.id)
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

// Catches properties that existed before this feature shipped (or whose
// geocode attempt failed at creation time, e.g. Nominatim briefly down).
// Fire-and-forget and naturally rate-limited by the geocode queue itself,
// so this is safe to run on every startup even with many properties.
const propertiesNeedingGeocode = db
  .prepare('SELECT id, address FROM properties WHERE lat IS NULL')
  .all()
for (const property of propertiesNeedingGeocode) {
  geocodeAddress(property.address).then((result) => {
    if (!result) return
    db.prepare('UPDATE properties SET lat = ?, lng = ? WHERE id = ?').run(
      result.lat,
      result.lng,
      property.id,
    )
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
