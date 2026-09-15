import { calculateQuote, formatCurrency } from '../data/quote'

function quoteFor(services, c) {
  return c.quote ?? calculateQuote(services, c.services, c.measurements)
}

function todayKey() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isToday(dateLike) {
  return Boolean(dateLike) && dateLike.slice(0, 10) === todayKey()
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function Dashboard({ contacts, services, onNavigate }) {
  const jobsToday = contacts.filter((c) => isToday(c.scheduledAt))
  const jobsTodayRevenue = jobsToday.reduce(
    (sum, c) => sum + quoteFor(services, c).total,
    0,
  )

  const newLeadsToday = contacts.filter(
    (c) => c.stage === 'lead' && isToday(c.createdAt),
  )

  const pendingEstimates = contacts.filter((c) => c.stage === 'quoted')
  const pendingEstimatesValue = pendingEstimates.reduce(
    (sum, c) => sum + quoteFor(services, c).total,
    0,
  )

  const unpaidInvoices = contacts.filter((c) => c.stage === 'invoiced')
  const unpaidValue = unpaidInvoices.reduce(
    (sum, c) => sum + quoteFor(services, c).total,
    0,
  )
  const overdueCount = unpaidInvoices.filter(
    (c) => c.invoice?.dueDate && c.invoice.dueDate < todayKey(),
  ).length

  const dueFollowUpsCount = contacts.reduce(
    (count, c) =>
      count + (c.followUps ?? []).filter((f) => !f.done && f.dueDate <= todayKey()).length,
    0,
  )

  return (
    <div className="dashboard">
      <div className="dashboard-date">Today · {todayLabel()}</div>

      <div className="today-grid">
        <button
          type="button"
          className="today-card"
          onClick={() => onNavigate('calendar')}
        >
          <h3>Jobs</h3>
          <p className="today-stat">{jobsToday.length} scheduled</p>
          <p className="today-substat">
            {formatCurrency(jobsTodayRevenue)} expected revenue
          </p>
        </button>

        <button
          type="button"
          className="today-card"
          onClick={() => onNavigate('followups')}
        >
          <h3>Follow-ups</h3>
          <p className="today-stat">{dueFollowUpsCount} due today</p>
        </button>

        <button
          type="button"
          className="today-card"
          onClick={() => onNavigate('board')}
        >
          <h3>New leads</h3>
          <p className="today-stat">{newLeadsToday.length}</p>
        </button>

        <button
          type="button"
          className="today-card"
          onClick={() => onNavigate('board')}
        >
          <h3>Estimates</h3>
          <p className="today-stat">{pendingEstimates.length} pending</p>
          <p className="today-substat">
            {formatCurrency(pendingEstimatesValue)} potential revenue
          </p>
        </button>

        <button
          type="button"
          className="today-card warning"
          onClick={() => onNavigate('board')}
        >
          <h3>Unpaid</h3>
          <p className="today-stat">{unpaidInvoices.length} invoices</p>
          <p className="today-substat">
            {formatCurrency(unpaidValue)}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </p>
        </button>
      </div>
    </div>
  )
}
