// The sales pipeline stages for a softwashing/pressure washing job.
// This list drives both the contact form's stage picker and (later)
// the pipeline board's columns, so it only needs to be defined once.
export const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'complete', label: 'Job Complete' },
  { id: 'invoiced', label: 'Invoiced' },
  { id: 'paid', label: 'Paid' },
]

export function stageLabel(stageId) {
  return STAGES.find((s) => s.id === stageId)?.label ?? stageId
}
