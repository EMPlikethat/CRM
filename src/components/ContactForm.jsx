import { useState } from 'react'
import { STAGES } from '../data/stages'
import { SERVICES } from '../data/services'

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  services: [],
  quotedPrice: '',
  stage: STAGES[0].id,
  scheduledAt: '',
}

export default function ContactForm({ onAdd }) {
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

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({ ...form, id: crypto.randomUUID() })
    setForm(EMPTY_FORM)
  }

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
          Quoted price ($)
          <input
            value={form.quotedPrice}
            onChange={(e) => updateField('quotedPrice', e.target.value)}
            inputMode="decimal"
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
        {SERVICES.map((service) => (
          <label key={service.id} className="service-checkbox">
            <input
              type="checkbox"
              checked={form.services.includes(service.id)}
              onChange={() => toggleService(service.id)}
            />
            {service.label}
          </label>
        ))}
      </fieldset>

      <button type="submit">Add contact</button>
    </form>
  )
}
