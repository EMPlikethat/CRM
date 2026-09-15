import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findOrCreateProperty } from './properties.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(path.join(__dirname, 'data.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    pricing TEXT NOT NULL
  )
`)

// A property is a house, identified by its address. Jobs link to a
// property (see contacts.propertyId below) so a house's history stays
// intact across however many different owners it has over time -
// that's the whole point: the durable record is the address, not
// whoever happened to live there for one visit.
db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    normalizedAddress TEXT NOT NULL UNIQUE
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    services TEXT NOT NULL DEFAULT '[]',
    measurements TEXT NOT NULL DEFAULT '{}',
    stage TEXT NOT NULL,
    scheduledAt TEXT,
    quote TEXT
  )
`)

// Migrations for databases created before a column existed. SQLite has
// no "ADD COLUMN IF NOT EXISTS", so just ignore the error when a column
// is already there.
for (const migration of [
  'ALTER TABLE contacts ADD COLUMN quote TEXT',
  'ALTER TABLE contacts ADD COLUMN email TEXT',
  'ALTER TABLE contacts ADD COLUMN propertyId TEXT',
  'ALTER TABLE contacts ADD COLUMN createdAt TEXT',
]) {
  try {
    db.exec(migration)
  } catch {
    // column already exists - nothing to do
  }
}

function nextFriday9am() {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  d.setHours(9, 0, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Seed data only runs once - the first time the database file is
// created. After that, whatever is in data.db is the source of truth.
const serviceCount = db.prepare('SELECT COUNT(*) AS count FROM services').get().count
if (serviceCount === 0) {
  const insertService = db.prepare(
    'INSERT INTO services (id, label, pricing) VALUES (?, ?, ?)',
  )
  insertService.run(
    'roof-softwash',
    'Complete Roof Soft Wash',
    JSON.stringify({ type: 'area', rate: 0.5 }),
  )
  insertService.run(
    'driveway-entree',
    'Pressure Washing Driveway and Entryway',
    JSON.stringify({ type: 'area', rate: 0.4 }),
  )
  insertService.run(
    'gutter-debris',
    'Gutter Debris Removal',
    JSON.stringify({ type: 'gutter', bottomRate: 1.5, topRate: 2.5 }),
  )
}

const contactCount = db.prepare('SELECT COUNT(*) AS count FROM contacts').get().count
if (contactCount === 0) {
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, name, phone, email, address, services, measurements, stage, scheduledAt, quote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertContact.run(
    'seed-1',
    'Maria Alvarez',
    '555-0142',
    'maria.alvarez@example.com',
    '118 Birchwood Dr',
    JSON.stringify(['roof-softwash', 'gutter-debris']),
    JSON.stringify({
      'roof-softwash': { sqft: 1400 },
      'gutter-debris': { bottomFt: 60, topFt: 30 },
    }),
    'lead',
    '',
    JSON.stringify({
      lineItems: [
        {
          serviceId: 'roof-softwash',
          label: 'Complete Roof Soft Wash',
          detail: '1400 sq ft × $0.50',
          subtotal: 700,
        },
        {
          serviceId: 'gutter-debris',
          label: 'Gutter Debris Removal',
          detail: '60 ft bottom @ $1.50 + 30 ft top @ $2.50',
          subtotal: 165,
        },
      ],
      total: 865,
    }),
  )
  insertContact.run(
    'seed-2',
    'Tom Nguyen',
    '555-0198',
    'tom.nguyen@example.com',
    '42 Lakeview Ct',
    JSON.stringify(['driveway-entree']),
    JSON.stringify({ 'driveway-entree': { sqft: 450 } }),
    'quoted',
    '',
    JSON.stringify({
      lineItems: [
        {
          serviceId: 'driveway-entree',
          label: 'Pressure Washing Driveway and Entryway',
          detail: '450 sq ft × $0.40',
          subtotal: 180,
        },
      ],
      total: 180,
    }),
  )
  insertContact.run(
    'seed-3',
    'Sara Kim',
    '555-0177',
    'sara.kim@example.com',
    '7 Willow Ave',
    JSON.stringify(['roof-softwash', 'driveway-entree']),
    JSON.stringify({
      'roof-softwash': { sqft: 1600 },
      'driveway-entree': { sqft: 300 },
    }),
    'scheduled',
    nextFriday9am(),
    JSON.stringify({
      lineItems: [
        {
          serviceId: 'roof-softwash',
          label: 'Complete Roof Soft Wash',
          detail: '1600 sq ft × $0.50',
          subtotal: 800,
        },
        {
          serviceId: 'driveway-entree',
          label: 'Pressure Washing Driveway and Entryway',
          detail: '300 sq ft × $0.40',
          subtotal: 120,
        },
      ],
      total: 920,
    }),
  )
}

// Backfill for any contact saved before propertyId/createdAt existed -
// including the seed rows just inserted above on a fresh database,
// since their INSERT doesn't set those columns. Safe to run every
// startup: it only touches rows that still need it.
const rowsNeedingBackfill = db
  .prepare('SELECT id, address, propertyId, createdAt FROM contacts WHERE propertyId IS NULL OR createdAt IS NULL')
  .all()
for (const row of rowsNeedingBackfill) {
  const propertyId = row.propertyId ?? findOrCreateProperty(db, row.address)
  const createdAt = row.createdAt ?? new Date().toISOString()
  db.prepare('UPDATE contacts SET propertyId = ?, createdAt = ? WHERE id = ?').run(
    propertyId,
    createdAt,
    row.id,
  )
}

export default db
