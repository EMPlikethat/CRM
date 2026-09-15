const BASE = '/api'

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send the session cookie on every request
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = new Error(
      body?.error || `${options?.method ?? 'GET'} ${path} failed: ${res.status}`,
    )
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export function get(path) {
  return request(path)
}

export function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}

export function put(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del(path) {
  return request(path, { method: 'DELETE' })
}
