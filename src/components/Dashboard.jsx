import { STAGES } from '../data/stages'
import { serviceLabels } from '../data/services'
import { calculateQuote, formatCurrency } from '../data/quote'
import { formatSchedule } from '../data/formatSchedule'

function quoteFor(services, c) {
  return c.quote ?? calculateQuote(services, c.services, c.measurements)
}

function nowLocalString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Dashboard({ contacts, services }) {
  const now = nowLocalString()

  const byStage = {}
  for (const stage of STAGES) {
    byStage[stage.id] = { count: 0, value: 0 }
  }
  for (const c of contacts) {
    const quote = quoteFor(services, c)
    if (!byStage[c.stage]) continue
    byStage[c.stage].count += 1
    byStage[c.stage].value += quote.total
  }

  const totalRevenue = byStage.paid?.value ?? 0
  const activePipelineValue = STAGES.filter((s) => s.id !== 'paid').reduce(
    (sum, s) => sum + (byStage[s.id]?.value ?? 0),
    0,
  )

  const upcoming = contacts
    .filter((c) => c.scheduledAt && c.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5)

  return (
    <div className="dashboard">
      <div className="hero-figure">
        <span className="hero-label">Revenue (paid)</span>
        <span className="hero-value">{formatCurrency(totalRevenue)}</span>
        <span className="hero-sublabel">
          {formatCurrency(activePipelineValue)} still active in the pipeline
        </span>
      </div>

      <div className="stat-row">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="stat-tile" style={{ '--tile-accent': `var(--stage-${i + 1})` }}>
            <span className="stat-label">{stage.label}</span>
            <span className="stat-value">{byStage[stage.id].count}</span>
            <span className="stat-sub">{formatCurrency(byStage[stage.id].value)}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Upcoming appointments</h2>
        {upcoming.length === 0 ? (
          <p className="empty-state">Nothing scheduled yet.</p>
        ) : (
          <ul className="upcoming-list">
            {upcoming.map((c) => (
              <li key={c.id} className="upcoming-item">
                <span className="upcoming-time">{formatSchedule(c.scheduledAt)}</span>
                <span className="upcoming-name">{c.name}</span>
                <span className="upcoming-detail">
                  {serviceLabels(services, c.services)}
                  {c.address ? ` — ${c.address}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
