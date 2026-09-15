const STORAGE_KEY = 'crm.contacts'

// Every contact starts in the first pipeline stage. This is the seed
// list you'll see the first time you open the app in a fresh browser.
const SEED_CONTACTS = [
  {
    id: 'seed-1',
    name: 'Maria Alvarez',
    phone: '555-0142',
    address: '118 Birchwood Dr',
    services: ['roof-softwash', 'gutter-debris'],
    measurements: {
      'roof-softwash': { sqft: 1400 },
      'gutter-debris': { bottomFt: 60, topFt: 30 },
    },
    stage: 'lead',
    scheduledAt: '',
  },
  {
    id: 'seed-2',
    name: 'Tom Nguyen',
    phone: '555-0198',
    address: '42 Lakeview Ct',
    services: ['driveway-entree'],
    measurements: {
      'driveway-entree': { sqft: 450 },
    },
    stage: 'quoted',
    scheduledAt: '',
  },
  {
    id: 'seed-3',
    name: 'Sara Kim',
    phone: '555-0177',
    address: '7 Willow Ave',
    services: ['roof-softwash', 'driveway-entree'],
    measurements: {
      'roof-softwash': { sqft: 1600 },
      'driveway-entree': { sqft: 300 },
    },
    stage: 'scheduled',
    scheduledAt: nextFriday9am(),
  },
]

function nextFriday9am() {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  d.setHours(9, 0, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function loadContacts() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return SEED_CONTACTS
  try {
    return JSON.parse(raw)
  } catch {
    return SEED_CONTACTS
  }
}

export function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
}
