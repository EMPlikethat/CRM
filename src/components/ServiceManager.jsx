import { useState } from 'react'

const PRICING_TYPES = [
  { value: 'area', label: 'Per square foot' },
  { value: 'linear', label: 'Per linear foot' },
]

const EMPTY_NEW_SERVICE = { label: '', pricingType: 'area', rate: '' }

export default function ServiceManager({ services, onAdd, onUpdate, onDelete }) {
  const [newService, setNewService] = useState(EMPTY_NEW_SERVICE)

  function handleAdd(e) {
    e.preventDefault()
    if (!newService.label.trim() || newService.rate === '') return
    onAdd({
      id: crypto.randomUUID(),
      label: newService.label.trim(),
      pricing: { type: newService.pricingType, rate: Number(newService.rate) },
    })
    setNewService(EMPTY_NEW_SERVICE)
  }

  return (
    <div className="service-manager">
      <table className="service-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Pricing</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>

      <form className="add-service-form" onSubmit={handleAdd}>
        <h3>Add a service</h3>
        <div className="add-service-grid">
          <label>
            Name
            <input
              value={newService.label}
              onChange={(e) =>
                setNewService((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="e.g. Fence Pressure Wash"
              required
            />
          </label>
          <label>
            Priced by
            <select
              value={newService.pricingType}
              onChange={(e) =>
                setNewService((prev) => ({ ...prev, pricingType: e.target.value }))
              }
            >
              {PRICING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rate ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newService.rate}
              onChange={(e) =>
                setNewService((prev) => ({ ...prev, rate: e.target.value }))
              }
              required
            />
          </label>
        </div>
        <button type="submit">Add service</button>
      </form>
    </div>
  )
}

function ServiceRow({ service, onUpdate, onDelete }) {
  function updateRate(field, value) {
    onUpdate(service.id, {
      pricing: { ...service.pricing, [field]: Number(value) },
    })
  }

  return (
    <tr>
      <td>
        <input
          className="service-name-input"
          value={service.label}
          onChange={(e) => onUpdate(service.id, { label: e.target.value })}
        />
      </td>
      <td className="service-pricing-cell">
        {service.pricing.type === 'gutter' ? (
          <>
            <label>
              Bottom $/ft
              <input
                type="number"
                min="0"
                step="0.01"
                value={service.pricing.bottomRate}
                onChange={(e) => updateRate('bottomRate', e.target.value)}
              />
            </label>
            <label>
              Top $/ft
              <input
                type="number"
                min="0"
                step="0.01"
                value={service.pricing.topRate}
                onChange={(e) => updateRate('topRate', e.target.value)}
              />
            </label>
          </>
        ) : (
          <label>
            $/{service.pricing.type === 'area' ? 'sq ft' : 'linear ft'}
            <input
              type="number"
              min="0"
              step="0.01"
              value={service.pricing.rate}
              onChange={(e) => updateRate('rate', e.target.value)}
            />
          </label>
        )}
      </td>
      <td>
        <button
          type="button"
          className="delete-btn"
          onClick={() => onDelete(service.id)}
          aria-label={`Delete ${service.label}`}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
