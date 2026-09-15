import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// scrypt is built into Node - no extra dependency, no native module to
// compile or download. A password's stored form is "salt:hash", both hex.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const candidate = scryptSync(password, salt, 64)
  // timingSafeEqual requires equal-length buffers, and throws otherwise -
  // guard that first so a malformed stored hash can't crash the request.
  if (candidate.length !== hashBuffer.length) return false
  return timingSafeEqual(candidate, hashBuffer)
}
