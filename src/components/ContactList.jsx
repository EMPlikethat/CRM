import { STAGES } from '../data/stages'
import { serviceLabels } from '../data/services'
import { calculateQuote, formatCurrency } from '../data/quote'

// Older contacts saved before quote-snapshotting was added won't have a
// stored `quote` - fall back to computing live from current rates just
// for those, so nothing breaks.
function quoteFor(services, c) {
  return c.quote ?? calculateQuote(services, c.services, c.measurements)
}

export default function ContactList({
  contacts,
  services,
  onUpdateStage,
  onUpdateSchedule,
  onDelete,
  onEdit,
}) {
  if (contacts.length === 0) {
    return <p className="empty-state">No contacts yet — add your first lead above.</p>
  }

  return (
    <table className="contact-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Address</th>
          <th>Services</th>
          <th>Quote</th>
          <th>Stage</th>
          <th>Scheduled</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => {
          const quote = quoteFor(services, c)
          return (
          <tr key={c.id}>
            <td>
              <button type="button" className="link-btn" onClick={() => onEdit(c.id)}>
                {c.name}
              </button>
            </td>
            <td>{c.phone}</td>
            <td>{c.email}</td>
            <td>{c.address}</td>
            <td>{serviceLabels(services, c.services)}</td>
            <td>{quote.total > 0 ? formatCurrency(quote.total) : '—'}</td>
            <td>
              <select
                value={c.stage}
                onChange={(e) => onUpdateStage(c.id, e.target.value)}
                aria-label={`Stage for ${c.name}`}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                type="datetime-local"
                value={c.scheduledAt || ''}
                onChange={(e) => onUpdateSchedule(c.id, e.target.value)}
                aria-label={`Scheduled time for ${c.name}`}
              />
            </td>
            <td>
              <button
                type="button"
                className="delete-btn"
                onClick={() => onDelete(c.id)}
                aria-label={`Delete ${c.name}`}
              >
                Delete
              </button>
            </td>
          </tr>
          )
        })}
      </tbody>
    </table>
  )
}
