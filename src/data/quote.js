import { findService } from './services'

// A contact's measurements are keyed by service id, e.g.
//   { 'roof-softwash': { sqft: 1400 },
//     'gutter-debris': { bottomFt: 60, topFt: 30 } }
// This is the only place pricing math happens, so a rate change only
// ever needs to happen in the services store.
export function calculateLineItem(services, serviceId, measurement = {}) {
  const service = findService(services, serviceId)
  if (!service) return null
  const { pricing } = service

  if (pricing.type === 'area') {
    const sqft = Number(measurement.sqft) || 0
    return {
      serviceId,
      label: service.label,
      detail: `${sqft} sq ft × $${pricing.rate.toFixed(2)}`,
      subtotal: sqft * pricing.rate,
    }
  }

  if (pricing.type === 'linear') {
    const linearFt = Number(measurement.linearFt) || 0
    return {
      serviceId,
      label: service.label,
      detail: `${linearFt} linear ft × $${pricing.rate.toFixed(2)}`,
      subtotal: linearFt * pricing.rate,
    }
  }

  if (pricing.type === 'gutter') {
    const bottomFt = Number(measurement.bottomFt) || 0
    const topFt = Number(measurement.topFt) || 0
    return {
      serviceId,
      label: service.label,
      detail: `${bottomFt} ft bottom @ $${pricing.bottomRate.toFixed(2)} + ${topFt} ft top @ $${pricing.topRate.toFixed(2)}`,
      subtotal: bottomFt * pricing.bottomRate + topFt * pricing.topRate,
    }
  }

  return null
}

export function calculateQuote(services, serviceIds = [], measurements = {}) {
  const lineItems = serviceIds
    .map((id) => calculateLineItem(services, id, measurements[id]))
    .filter(Boolean)
  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
  return { lineItems, total }
}

export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`
}
