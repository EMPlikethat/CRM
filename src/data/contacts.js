import { get, post, put, del } from './api'

export function fetchContacts() {
  return get('/contacts')
}

export function createContact(contact) {
  return post('/contacts', contact)
}

export function saveContactUpdate(id, updates) {
  return put(`/contacts/${id}`, updates)
}

export function removeContact(id) {
  return del(`/contacts/${id}`)
}
