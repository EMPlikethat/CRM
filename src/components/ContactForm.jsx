import { useState } from 'react'
import { STAGES } from '../data/stages'

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  service: '',
  quotedPrice: '',
  stage: STAGES[0].id,
}

export default function ContactForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
          Service
          <input
            value={form.service}
            onChange={(e) => updateField('service', e.target.value)}
            placeholder="e.g. Roof softwash"
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
      </div>
      <button type="submit">Add contact</button>
    </form>
  )
}
