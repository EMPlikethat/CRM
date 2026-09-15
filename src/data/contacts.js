const STORAGE_KEY = 'crm.contacts'

// Every contact starts in the first pipeline stage. This is the seed
// list you'll see the first time you open the app in a fresh browser.
const SEED_CONTACTS = [
  {
    id: 'seed-1',
    name: 'Maria Alvarez',
    phone: '555-0142',
    address: '118 Birchwood Dr',
    service: 'House softwash',
    quotedPrice: '350',
    stage: 'lead',
  },
  {
    id: 'seed-2',
    name: 'Tom Nguyen',
    phone: '555-0198',
    address: '42 Lakeview Ct',
    service: 'Driveway pressure wash',
    quotedPrice: '180',
    stage: 'quoted',
  },
]

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
