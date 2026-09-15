import { useState } from 'react'
import { changePassword } from '../data/auth'

export default function SettingsView({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const [saveStatus, setSaveStatus] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState(null)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      const updated = await onSave({
        businessName: form.businessName,
        businessPhone: form.businessPhone,
        businessEmail: form.businessEmail,
        invoiceDueDays: Number(form.invoiceDueDays),
      })
      setForm(updated)
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus(err.message)
    }
    setTimeout(() => setSaveStatus(null), 3000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords don't match")
      return
    }
    setPasswordStatus('saving')
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus('changed')
    } catch (err) {
      setPasswordStatus(err.message)
    }
    setTimeout(() => setPasswordStatus(null), 4000)
  }

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <div className="activity-panel">
        <h3>Business profile</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="form-grid">
            <label>
              Business name
              <input
                value={form.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                required
              />
            </label>
            <label>
              Phone
              <input
                value={form.businessPhone}
                onChange={(e) => updateField('businessPhone', e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.businessEmail}
                onChange={(e) => updateField('businessEmail', e.target.value)}
              />
            </label>
            <label>
              Invoice due (days after issue)
              <input
                type="number"
                min="1"
                value={form.invoiceDueDays}
                onChange={(e) => updateField('invoiceDueDays', e.target.value)}
                required
              />
            </label>
          </div>
          <p className="settings-hint">
            Business name shows in the app header, the sign-in screen, and
            invoice emails. Changing the invoice due days only affects
            invoices created from now on - it never rewrites a due date
            already sent to a customer.
          </p>
          <button type="submit" disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
          {saveStatus === 'saved' && <span className="settings-status-ok"> Saved!</span>}
          {saveStatus && saveStatus !== 'saving' && saveStatus !== 'saved' && (
            <p className="invoice-email-error">{saveStatus}</p>
          )}
        </form>
      </div>

      <div className="activity-panel">
        <h3>Change password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-grid">
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
          </div>
          <button type="submit" disabled={passwordStatus === 'saving'}>
            {passwordStatus === 'saving' ? 'Saving…' : 'Change password'}
          </button>
          {passwordStatus === 'changed' && <span className="settings-status-ok"> Password changed!</span>}
          {passwordStatus && passwordStatus !== 'saving' && passwordStatus !== 'changed' && (
            <p className="invoice-email-error">{passwordStatus}</p>
          )}
        </form>
      </div>
    </div>
  )
}
