import { useEffect, useState } from 'react'
import { STAGES } from '../data/stages'
import { calculateQuote, formatCurrency } from '../data/quote'

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
}) {
  const isEditing = Boolean(editingContact)
  const [form, setForm] = useState(() => toFormState(editingContact))

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
