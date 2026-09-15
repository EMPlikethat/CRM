import { useEffect, useState } from 'react'
import { STAGES } from '../data/stages'
import { calculateQuote, formatCurrency } from '../data/quote'
import { sendInvoiceEmail } from '../data/contacts'

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toFormState(contact) {
  return {
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    address: contact?.address ?? '',
    services: contact?.services ?? [],
    measurements: contact?.measurements ?? {},
    stage: contact?.stage ?? STAGES[0].id,
    scheduledAt: contact?.scheduledAt ?? '',
    invoice: contact?.invoice ?? null,
    payment: contact?.payment ?? null,
  }
}

export default function ContactForm({
  services,
  onAdd,
  editingContact,
  onSave,
  onCancel,
  onDelete,
  onAddNote,
  onDeleteNote,
  onAddFollowUp,
  onToggleFollowUp,
  onDeleteFollowUp,
}) {
  const isEditing = Boolean(editingContact)
  const [form, setForm] = useState(() => toFormState(editingContact))
  const [linkCopied, setLinkCopied] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [newFollowUpText, setNewFollowUpText] = useState('')
  const [newFollowUpDate, setNewFollowUpDate] = useState('')

  // Only re-initialize when the modal switches to a different contact,
  // not on every contacts-array update - otherwise unrelated changes
  // elsewhere would blow away whatever the user is mid-typing here.
  useEffect(() => {
    setForm(toFormState(editingContact))
  }, [editingContact?.id])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleService(serviceId) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId],
    }))
  }

  function updateMeasurement(serviceId, field, value) {
    setForm((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [serviceId]: { ...prev.measurements[serviceId], [field]: value },
      },
    }))
  }

  function updateInvoiceField(field, value) {
    setForm((prev) => ({ ...prev, invoice: { ...prev.invoice, [field]: value } }))
  }

  function updatePaymentField(field, value) {
    setForm((prev) => ({ ...prev, payment: { ...prev.payment, [field]: value } }))
  }

  function copyPayLink() {
    const link = `${window.location.origin}/pay/${form.invoice.payToken}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleSendEmail() {
    setEmailStatus('sending')
    try {
      await sendInvoiceEmail(editingContact.id)
      setEmailStatus('sent')
    } catch (err) {
      setEmailStatus(err.message)
    }
    setTimeout(() => setEmailStatus(null), 4000)
  }

  async function handleAddNote() {
    if (!newNoteText.trim()) return
    await onAddNote(editingContact.id, newNoteText.trim())
    setNewNoteText('')
  }

  async function handleAddFollowUp() {
    if (!newFollowUpText.trim() || !newFollowUpDate) return
    await onAddFollowUp(editingContact.id, newFollowUpText.trim(), newFollowUpDate)
    setNewFollowUpText('')
    setNewFollowUpDate('')
  }

  // Computed live from the *current* service rates as you type, so it's
  // always accurate while you're still editing. handleSubmit freezes
  // this exact result onto the contact - after that, changing a rate in
  // "Manage services" won't touch it. Only saving this contact again
  // (through this same form) recalculates its price.
  const quote = calculateQuote(services, form.services, form.measurements)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (isEditing) {
      onSave(editingContact.id, { ...form, quote })
    } else {
      onAdd({ ...form, quote, id: crypto.randomUUID() })
      setForm(toFormState(null))
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h2>{isEditing ? 'Edit contact' : 'Add contact'}</h2>
      <div className="form-grid">
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </label>
        <label>
          Phone
          <input
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </label>
        <label>
          Address
          <input
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
          />
        </label>
        <label>
          Stage
          <select
            value={form.stage}
            onChange={(e) => updateField('stage', e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scheduled time
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => updateField('scheduledAt', e.target.value)}
          />
        </label>
      </div>

      <fieldset className="services-field">
        <legend>Services</legend>
        {services.map((service) => {
          const checked = form.services.includes(service.id)
          const measurement = form.measurements[service.id] ?? {}
          return (
            <div key={service.id} className="service-row">
              <label className="service-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleService(service.id)}
                />
                {service.label}
              </label>

              {checked && service.pricing.type === 'area' && (
                <label className="measurement-field">
                  Square footage
                  <input
                    type="number"
                    min="0"
                    value={measurement.sqft ?? ''}
                    onChange={(e) =>
                      updateMeasurement(service.id, 'sqft', e.target.value)
                    }
                  />
                </label>
              )}

              {checked && service.pricing.type === 'linear' && (
                <label className="measurement-field">
                  Linear footage
                  <input
                    type="number"
                    min="0"
                    value={measurement.linearFt ?? ''}
                    onChange={(e) =>
                      updateMeasurement(service.id, 'linearFt', e.target.value)
                    }
                  />
                </label>
              )}

              {checked && service.pricing.type === 'gutter' && (
                <div className="measurement-pair">
                  <label className="measurement-field">
                    Bottom story (linear ft)
                    <input
                      type="number"
                      min="0"
                      value={measurement.bottomFt ?? ''}
                      onChange={(e) =>
                        updateMeasurement(service.id, 'bottomFt', e.target.value)
                      }
                    />
                  </label>
                  <label className="measurement-field">
                    Top story (linear ft)
                    <input
                      type="number"
                      min="0"
                      value={measurement.topFt ?? ''}
                      onChange={(e) =>
                        updateMeasurement(service.id, 'topFt', e.target.value)
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </fieldset>

      {quote.lineItems.length > 0 && (
        <div className="quote-preview">
          <h3>Quote preview</h3>
          <p className="quote-lock-note">
            Locks in at today's rates when you {isEditing ? 'save' : 'add'} this contact.
          </p>
          {quote.lineItems.map((item) => (
            <div key={item.serviceId} className="quote-line">
              <span className="quote-line-label">{item.label}</span>
              <span className="quote-line-detail">{item.detail}</span>
              <span className="quote-line-amount">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
          <div className="quote-total">
            <span>Total</span>
            <span>{formatCurrency(quote.total)}</span>
          </div>
        </div>
      )}

      {form.invoice && (
        <div className="invoice-panel">
          <h3>Invoice {form.invoice.number}</h3>
          <div className="invoice-grid">
            <div className="invoice-readonly">
              <span className="invoice-readonly-label">Issued</span>
              <span>{form.invoice.issueDate}</span>
            </div>
            <label>
              Due date
              <input
                type="date"
                value={form.invoice.dueDate}
                onChange={(e) => updateInvoiceField('dueDate', e.target.value)}
              />
            </label>
          </div>

          {form.invoice.payToken && form.stage !== 'paid' && (
            <div className="pay-link-row">
              <input
                readOnly
                className="pay-link-input"
                value={`${window.location.origin}/pay/${form.invoice.payToken}`}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={copyPayLink}>
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
              {form.email && (
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailStatus === 'sending'}
                >
                  {emailStatus === 'sending'
                    ? 'Sending…'
                    : emailStatus === 'sent'
                      ? 'Sent!'
                      : 'Send email'}
                </button>
              )}
            </div>
          )}
          {emailStatus && emailStatus !== 'sending' && emailStatus !== 'sent' && (
            <p className="invoice-email-error">{emailStatus}</p>
          )}
        </div>
      )}

      {form.payment && (
        <div className="invoice-panel">
          <h3>Payment</h3>
          <div className="invoice-grid">
            <label>
              Date paid
              <input
                type="date"
                value={form.payment.date}
                onChange={(e) => updatePaymentField('date', e.target.value)}
              />
            </label>
            <label>
              Method
              <input
                value={form.payment.method}
                onChange={(e) => updatePaymentField('method', e.target.value)}
                placeholder="e.g. Check #1234, Venmo, Cash"
              />
            </label>
            <label>
              Amount ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.payment.amount}
                onChange={(e) =>
                  updatePaymentField('amount', Number(e.target.value))
                }
              />
            </label>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="activity-panel">
          <h3>Notes</h3>
          <div className="note-add-form">
            <input
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddNote()
                }
              }}
              placeholder="Add a note…"
            />
            <button type="button" onClick={handleAddNote}>
              Add
            </button>
          </div>
          <ul className="notes-list">
            {[...editingContact.notes].reverse().map((note) => (
              <li key={note.id} className="note-item">
                <div>
                  <p className="note-text">{note.text}</p>
                  <span className="note-date">{formatDateTime(note.createdAt)}</span>
                </div>
                <button
                  type="button"
                  className="note-delete"
                  onClick={() => onDeleteNote(editingContact.id, note.id)}
                  aria-label="Delete note"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isEditing && (
        <div className="activity-panel">
          <h3>Follow-ups</h3>
          <div className="followup-add-form">
            <input
              value={newFollowUpText}
              onChange={(e) => setNewFollowUpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddFollowUp()
                }
              }}
              placeholder="What needs following up?"
            />
            <input
              type="date"
              value={newFollowUpDate}
              onChange={(e) => setNewFollowUpDate(e.target.value)}
            />
            <button type="button" onClick={handleAddFollowUp}>
              Add
            </button>
          </div>
          <ul className="followups-list">
            {editingContact.followUps.map((f) => {
              const overdue = !f.done && f.dueDate < todayISO()
              return (
                <li
                  key={f.id}
                  className={`followup-item${f.done ? ' done' : ''}${overdue ? ' overdue' : ''}`}
                >
                  <label className="followup-checkbox">
                    <input
                      type="checkbox"
                      checked={f.done}
                      onChange={() =>
                        onToggleFollowUp(editingContact.id, f.id, !f.done)
                      }
                    />
                    <span className="followup-text">{f.text}</span>
                  </label>
                  <span className="followup-date">{f.dueDate}</span>
                  <button
                    type="button"
                    className="note-delete"
                    onClick={() => onDeleteFollowUp(editingContact.id, f.id)}
                    aria-label="Delete follow-up"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="form-actions">
        <button type="submit">{isEditing ? 'Save changes' : 'Add contact'}</button>
        {isEditing && (
          <>
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="delete-btn"
              onClick={() => onDelete(editingContact.id)}
            >
              Delete contact
            </button>
          </>
        )}
      </div>
    </form>
  )
}
