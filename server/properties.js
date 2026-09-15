import crypto from 'node:crypto'
import { geocodeAddress } from './geocode.js'

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
  scheduleGeocode(db, id, address.trim())
  return id
}

// Fire-and-forget, same pattern as invoice emails: geocoding a brand new
// property never blocks or fails the contact save that triggered it. A
// failed lookup (bad address, Nominatim unreachable) just leaves lat/lng
// null - the Map view shows it as "not yet located" with a manual retry,
// rather than erroring.
function scheduleGeocode(db, propertyId, address) {
  geocodeAddress(address).then((result) => {
    if (!result) return
    db.prepare('UPDATE properties SET lat = ?, lng = ? WHERE id = ?').run(
      result.lat,
      result.lng,
      propertyId,
    )
  })
}
