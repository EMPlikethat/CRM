import { get, post } from './api'

export function fetchAuthStatus() {
  return get('/auth/status')
}

export function setupAccount(email, password) {
  return post('/auth/setup', { email, password })
}

export function login(email, password) {
  return post('/auth/login', { email, password })
}

export function logout() {
  return post('/auth/logout')
}
