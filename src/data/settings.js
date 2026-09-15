import { get, put } from './api'

export function fetchPublicSettings() {
  return get('/settings/public')
}

export function fetchSettings() {
  return get('/settings')
}

export function saveSettings(updates) {
  return put('/settings', updates)
}
