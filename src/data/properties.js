import { get, post } from './api'

export function fetchProperties() {
  return get('/properties')
}

export function retryGeocode(id) {
  return post(`/properties/${id}/geocode`)
}

// Groups contacts by propertyId (falling back to a normalized address
// string for any contact saved before propertyId existed), so a house's
// full history - across however many different owners it's had - shows
// up together instead of scattered across separate, unlinked records.
export function groupByProperty(contacts) {
  const groups = new Map()

  for (const c of contacts) {
    const address = (c.address ?? '').trim()
    const key = c.propertyId || (address ? `address:${address.toLowerCase()}` : null)
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, { key, address, jobs: [] })
    }
    groups.get(key).jobs.push(c)
  }

  const result = [...groups.values()]
  for (const group of result) {
    group.jobs.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    // Most recent job's address text wins for display, in case it was
    // retyped slightly differently since the property was first seen.
    group.address = group.jobs[0]?.address || group.address
  }
  result.sort((a, b) => a.address.localeCompare(b.address))
  return result
}

export function filterPropertyGroups(groups, query) {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups.filter(
    (g) =>
      g.address.toLowerCase().includes(q) ||
      g.jobs.some((job) => job.name.toLowerCase().includes(q)),
  )
}
