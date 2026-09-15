import express from 'express'
import db from './db.js'

const app = express()
app.use(express.json())

function rowToService(row) {
  return { id: row.id, label: row.label, pricing: JSON.parse(row.pricing) }
}

function rowToContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    address: row.address ?? '',
    services: JSON.parse(row.services),
    measurements: JSON.parse(row.measurements),
    stage: row.stage,
    scheduledAt: row.scheduledAt ?? '',
  }
}

// --- Services ---

app.get('/api/services', (req, res) => {
  const rows = db.prepare('SELECT * FROM services').all()
  res.json(rows.map(rowToService))
})

app.post('/api/services', (req, res) => {
  const { id, label, pricing } = req.body
  db.prepare('INSERT INTO services (id, label, pricing) VALUES (?, ?, ?)').run(
    id,
    label,
    JSON.stringify(pricing),
  )
  res.status(201).json({ id, label, pricing })
})

app.put('/api/services/:id', (req, res) => {
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

app.delete('/api/services/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// --- Contacts ---

app.get('/api/contacts', (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts').all()
  res.json(rows.map(rowToContact))
})

app.post('/api/contacts', (req, res) => {
  const c = req.body
  db.prepare(`
    INSERT INTO contacts (id, name, phone, address, services, measurements, stage, scheduledAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    c.id,
    c.name,
    c.phone ?? '',
    c.address ?? '',
    JSON.stringify(c.services ?? []),
    JSON.stringify(c.measurements ?? {}),
    c.stage,
    c.scheduledAt ?? '',
  )
  res.status(201).json(c)
})

app.put('/api/contacts/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = { ...rowToContact(existing), ...req.body }
  db.prepare(`
    UPDATE contacts
    SET name = ?, phone = ?, address = ?, services = ?, measurements = ?, stage = ?, scheduledAt = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.phone,
    updated.address,
    JSON.stringify(updated.services),
    JSON.stringify(updated.measurements),
    updated.stage,
    updated.scheduledAt,
    req.params.id,
  )
  res.json(updated)
})

app.delete('/api/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
