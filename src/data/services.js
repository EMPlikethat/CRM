// The services this business offers. A contact can select more than one,
// so this list drives a checkbox group rather than a single dropdown.
export const SERVICES = [
  { id: 'roof-softwash', label: 'Complete Roof Soft Wash' },
  { id: 'gutter-debris', label: 'Gutter Debris Removal' },
  { id: 'driveway-entree', label: 'Pressure Washing Driveway and Entree Way' },
]

export function serviceLabels(serviceIds = []) {
  return serviceIds
    .map((id) => SERVICES.find((s) => s.id === id)?.label ?? id)
    .join(', ')
}
