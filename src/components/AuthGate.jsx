import { useState } from 'react'
import { setupAccount, login } from '../data/auth'

export default function AuthGate({ needsSetup, onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (needsSetup) {
        await setupAccount(email, password)
      } else {
        await login(email, password)
      }
      onAuthenticated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-gate">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>My Clean Homie</h1>
        <p className="subtitle">
          {needsSetup ? 'Create the admin account' : 'Sign in'}
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={needsSetup ? 8 : undefined}
          />
        </label>
        {needsSetup && (
          <p className="auth-hint">
            This is the only account this CRM will have until you build
            multi-user support - use a password manager.
          </p>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : needsSetup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
