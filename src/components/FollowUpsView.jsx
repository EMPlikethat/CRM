function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function FollowUpsView({ contacts, onEdit, onToggleFollowUp }) {
  const today = todayISO()
  const allFollowUps = contacts.flatMap((c) =>
    (c.followUps ?? []).map((f) => ({ ...f, contactId: c.id, contactName: c.name })),
  )
  const pending = allFollowUps
    .filter((f) => !f.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const done = allFollowUps.filter((f) => f.done)

  return (
    <div className="followups-view">
      <h2>Follow-ups</h2>
      {pending.length === 0 ? (
        <p className="empty-state">No pending follow-ups.</p>
      ) : (
        <ul className="followup-list-view">
          {pending.map((f) => {
            const overdue = f.dueDate < today
            return (
              <li
                key={f.id}
                className={`followup-view-item${overdue ? ' overdue' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={f.done}
                  onChange={() => onToggleFollowUp(f.contactId, f.id, true)}
                />
                <div className="followup-view-body">
                  <p className="followup-view-text">{f.text}</p>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onEdit(f.contactId)}
                  >
                    {f.contactName}
                  </button>
                </div>
                <span className={`followup-view-date${overdue ? ' overdue' : ''}`}>
                  {f.dueDate}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {done.length > 0 && (
        <details className="followups-done">
          <summary>{done.length} completed</summary>
          <ul className="followup-list-view">
            {done.map((f) => (
              <li key={f.id} className="followup-view-item done">
                <input
                  type="checkbox"
                  checked={f.done}
                  onChange={() => onToggleFollowUp(f.contactId, f.id, false)}
                />
                <div className="followup-view-body">
                  <p className="followup-view-text">{f.text}</p>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onEdit(f.contactId)}
                  >
                    {f.contactName}
                  </button>
                </div>
                <span className="followup-view-date">{f.dueDate}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
