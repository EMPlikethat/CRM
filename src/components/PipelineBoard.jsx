import { useState } from 'react'
import { STAGES } from '../data/stages'
import { serviceLabels } from '../data/services'
import { formatSchedule } from '../data/formatSchedule'
import { calculateQuote, formatCurrency } from '../data/quote'

// Older contacts saved before quote-snapshotting was added won't have a
// stored `quote` - fall back to computing live from current rates just
// for those, so nothing breaks.
function quoteFor(services, c) {
  return c.quote ?? calculateQuote(services, c.services, c.measurements)
}

export default function PipelineBoard({
  contacts,
  services,
  onUpdateStage,
  onUpdateSchedule,
  onDelete,
  onEdit,
}) {
  const [dragOverStage, setDragOverStage] = useState(null)
  const [editingScheduleId, setEditingScheduleId] = useState(null)

  function handleDragStart(e, contactId) {
    // dataTransfer is how the browser hands data from the dragged
    // element to whatever it gets dropped on — it's the only channel
    // native drag-and-drop gives you.
    e.dataTransfer.setData('text/plain', contactId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, stageId) {
    e.preventDefault()
    const contactId = e.dataTransfer.getData('text/plain')
    onUpdateStage(contactId, stageId)
    setDragOverStage(null)
  }

  return (
    <div className="board">
      {STAGES.map((stage) => {
        const stageContacts = contacts.filter((c) => c.stage === stage.id)
        return (
          <div
            key={stage.id}
            className={
              'board-column' + (dragOverStage === stage.id ? ' drag-over' : '')
            }
            onDragOver={(e) => {
              e.preventDefault() // required or the browser rejects the drop
              setDragOverStage(stage.id)
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <h3>
              {stage.label} <span className="count">{stageContacts.length}</span>
            </h3>
            <div className="board-cards">
              {stageContacts.map((c) => {
                const scheduledLabel = formatSchedule(c.scheduledAt)
                const isEditingSchedule = editingScheduleId === c.id
                const quote = quoteFor(services, c)
                return (
                  <div
                    key={c.id}
                    className="board-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                  >
                    <button
                      type="button"
                      className="card-name"
                      onClick={() => onEdit(c.id)}
                    >
                      {c.name}
                    </button>
                    {c.services?.length > 0 && (
                      <div className="card-service">
                        {serviceLabels(services, c.services)}
                      </div>
                    )}
                    {quote.total > 0 && (
                      <div className="card-price">{formatCurrency(quote.total)}</div>
                    )}

                    {isEditingSchedule ? (
                      <input
                        type="datetime-local"
                        className="card-schedule-input"
                        autoFocus
                        value={c.scheduledAt || ''}
                        onChange={(e) => onUpdateSchedule(c.id, e.target.value)}
                        onBlur={() => setEditingScheduleId(null)}
                        aria-label={`Scheduled time for ${c.name}`}
                      />
                    ) : (
                      <button
                        type="button"
                        className="card-schedule-btn"
                        onClick={() => setEditingScheduleId(c.id)}
                      >
                        {scheduledLabel ? `📅 ${scheduledLabel}` : '+ Schedule'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="card-delete"
                      onClick={() => onDelete(c.id)}
                      aria-label={`Delete ${c.name}`}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
