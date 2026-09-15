const STORAGE_KEY = 'crm.services'

// Today's services and rates, used the first time the app runs. Once
// saved, localStorage is the source of truth, so edits made through the
// "Manage services" screen persist across reloads just like contacts do.
const SEED_SERVICES = [
  {
    id: 'roof-softwash',
    label: 'Complete Roof Soft Wash',
    pricing: { type: 'area', rate: 0.5 },
  },
  {
    id: 'driveway-entree',
    label: 'Pressure Washing Driveway and Entryway',
    pricing: { type: 'area', rate: 0.4 },
  },
  {
    id: 'gutter-debris',
    label: 'Gutter Debris Removal',
    // Two tiers: gutters on the ground-floor roofline are easier to
    // reach than a second story, so they're priced differently.
    pricing: { type: 'gutter', bottomRate: 1.5, topRate: 2.5 },
  },
]

export function loadServices() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return SEED_SERVICES
  try {
    return JSON.parse(raw)
  } catch {
    return SEED_SERVICES
  }
}

export function saveServices(services) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services))
}

export function findService(services, id) {
  return services.find((s) => s.id === id)
}

export function serviceLabels(services, serviceIds = []) {
  return serviceIds
    .map((id) => findService(services, id)?.label ?? id)
    .join(', ')
}
