import { useState } from 'react'
import { STAGES } from '../data/stages'
import { calculateQuote, formatCurrency } from '../data/quote'

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  services: [],
  measurements: {},
  stage: STAGES[0].id,
  scheduledAt: '',
}

export default function ContactForm({ services, onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM)

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

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({ ...form, id: crypto.randomUUID() })
    setForm(EMPTY_FORM)
  }

  const quote = calculateQuote(services, form.services, form.measurements)

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h2>Add contact</h2>
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

      <button type="submit">Add contact</button>
    </form>
  )
}
