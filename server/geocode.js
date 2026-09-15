// Free geocoding via OpenStreetMap's Nominatim - no API key, no billing
// account, unlike Google Maps. In exchange it asks for two things: a
// descriptive User-Agent (not the default one every HTTP client sends)
// and no more than one request per second, so every call goes through
// a single serialized queue rather than firing in parallel.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'MyCleanHomieCRM/1.0 (small-business CRM; contact via app owner)'
const MIN_INTERVAL_MS = 1100

let queueTail = Promise.resolve()

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function geocodeNow(address) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`)
  const results = await res.json()
  if (results.length === 0) return null
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) }
}

// Queues a geocode lookup behind every other one already queued, so no
// matter how many properties need locating at once, calls to Nominatim
// stay spaced out. Returns null (never throws) on any failure - a bad
// address, no match, or the service being unreachable - so callers can
// treat "not located yet" as a normal, retryable state rather than an
// error to handle.
export function geocodeAddress(address) {
  const result = queueTail
    .then(() => delay(MIN_INTERVAL_MS))
    .then(() => geocodeNow(address))
    .catch(() => null)
  queueTail = result.catch(() => {})
  return result
}
