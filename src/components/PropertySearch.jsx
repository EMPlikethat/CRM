import { useState } from 'react'
import { groupByProperty, filterPropertyGroups } from '../data/properties'
import { serviceLabels } from '../data/services'
import { stageLabel } from '../data/stages'
import { calculateQuote, formatCurrency } from '../data/quote'

function quoteFor(services, c) {
  return c.quote ?? calculateQuote(services, c.services, c.measurements)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PropertySearch({ contacts, services, onEdit }) {
  const [query, setQuery] = useState('')
  const groups = groupByProperty(contacts)
  const filtered = filterPropertyGroups(groups, query)

  return (
    <div className="property-search">
      <input
        type="search"
        className="property-search-input"
        placeholder="Search by address or owner name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {filtered.length === 0 && (
        <p className="empty-state">
          {contacts.length === 0
            ? 'No properties yet — add a contact to get started.'
            : 'No properties match that search.'}
        </p>
      )}

      <div className="property-list">
        {filtered.map((group) => (
          <div key={group.key} className="property-card">
            <div className="property-card-header">
              <h3>{group.address}</h3>
              <span className="property-job-count">
                {group.jobs.length} {group.jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </div>
            <table className="property-jobs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Owner</th>
                  <th>Services</th>
                  <th>Charged</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {group.jobs.map((job) => {
                  const quote = quoteFor(services, job)
                  const isPaid = job.stage === 'paid'
                  return (
                    <tr key={job.id}>
                      <td>{formatDate(job.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => onEdit(job.id)}
                        >
                          {job.name}
                        </button>
                        {job.phone && (
                          <div className="property-job-sub">{job.phone}</div>
                        )}
                      </td>
                      <td>{serviceLabels(services, job.services) || '—'}</td>
                      <td>{quote.total > 0 ? formatCurrency(quote.total) : '—'}</td>
                      <td>
                        <span
                          className={'status-badge' + (isPaid ? ' paid' : '')}
                        >
                          {isPaid ? 'Paid' : stageLabel(job.stage)}
                        </span>
                        {isPaid && job.payment && (
                          <div className="property-job-sub">
                            {formatDate(job.payment.date)}
                            {job.payment.method ? ` · ${job.payment.method}` : ''}
                          </div>
                        )}
                        {!isPaid && job.invoice && (
                          <div className="property-job-sub">
                            {job.invoice.number} · due {formatDate(job.invoice.dueDate)}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
