import { STAGES } from '../data/stages'

export default function ContactList({ contacts, onUpdateStage, onDelete }) {
  if (contacts.length === 0) {
    return <p className="empty-state">No contacts yet — add your first lead above.</p>
  }

  return (
    <table className="contact-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Address</th>
          <th>Service</th>
          <th>Quoted</th>
          <th>Stage</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.phone}</td>
            <td>{c.address}</td>
            <td>{c.service}</td>
            <td>{c.quotedPrice ? `$${c.quotedPrice}` : '—'}</td>
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
        ))}
      </tbody>
    </table>
  )
}
