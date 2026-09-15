import { get, post, put, del, upload } from './api'

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

export function sendInvoiceEmail(id) {
  return post(`/contacts/${id}/send-invoice-email`)
}

export function addNote(id, text) {
  return post(`/contacts/${id}/notes`, { text })
}

export function deleteNote(id, noteId) {
  return del(`/contacts/${id}/notes/${noteId}`)
}

export function addFollowUp(id, text, dueDate) {
  return post(`/contacts/${id}/follow-ups`, { text, dueDate })
}

export function toggleFollowUp(id, followUpId, done) {
  return put(`/contacts/${id}/follow-ups/${followUpId}`, { done })
}

export function deleteFollowUp(id, followUpId) {
  return del(`/contacts/${id}/follow-ups/${followUpId}`)
}

export function uploadPhoto(id, file, caption) {
  const formData = new FormData()
  formData.append('photo', file)
  formData.append('caption', caption)
  return upload(`/contacts/${id}/photos`, formData)
}

export function deletePhoto(id, photoId) {
  return del(`/contacts/${id}/photos/${photoId}`)
}
