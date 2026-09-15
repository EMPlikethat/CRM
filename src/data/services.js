// The services this business offers, each with its own pricing model.
// A contact can select more than one, so this list drives a checkbox
// group (not a single dropdown). `pricing` tells the quote calculator
// how to turn a measurement into a dollar line item.
export const SERVICES = [
  {
    id: 'roof-softwash',
    label: 'Complete Roof Soft Wash',
    pricing: { type: 'area', rate: 0.5 },
  },
  {
    id: 'driveway-entree',
    label: 'Pressure Washing Driveway and Entryway',
    pricing: { type: 'area', rate: 0.4 },
  },
  {
    id: 'gutter-debris',
    label: 'Gutter Debris Removal',
    // Two tiers: gutters on the ground-floor roofline are easier to
    // reach than a second story, so they're priced differently.
    pricing: { type: 'gutter', bottomRate: 1.5, topRate: 2.5 },
  },
]

export function findService(id) {
  return SERVICES.find((s) => s.id === id)
}

export function serviceLabels(serviceIds = []) {
  return serviceIds.map((id) => findService(id)?.label ?? id).join(', ')
}
