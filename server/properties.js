import crypto from 'node:crypto'

// Loose normalization so "123 Main St" and "123 main st." link to the
// same property. Doesn't handle "St" vs "Street" - a real address
// normalizer/geocoder is future work (see the Map roadmap item).
export function normalizeAddress(address) {
  return (address ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/, '')
}

// This is the mechanism that links a job to its house rather than to
// whoever happened to own it that visit: every contact/job's address
// resolves to the same property row as long as it normalizes the same
// way, regardless of what name was on the job.
export function findOrCreateProperty(db, address) {
  const normalized = normalizeAddress(address)
  if (!normalized) return null

  const existing = db
    .prepare('SELECT id FROM properties WHERE normalizedAddress = ?')
    .get(normalized)
  if (existing) return existing.id

  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO properties (id, address, normalizedAddress) VALUES (?, ?, ?)',
  ).run(id, address.trim(), normalized)
  return id
}
