import { useState } from 'react'
import { serviceLabels } from '../data/services'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// scheduledAt is a "YYYY-MM-DDTHH:mm" local string from a datetime-local
// input, so the date part can just be sliced off - no timezone math.
function dateKey(scheduledAt) {
  return scheduledAt?.slice(0, 10) ?? null
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function localDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTime(scheduledAt) {
  const d = new Date(scheduledAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function CalendarView({ contacts, services }) {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const appointmentsByDay = {}
  for (const c of contacts) {
    const key = dateKey(c.scheduledAt)
    if (!key) continue
    ;(appointmentsByDay[key] ??= []).push(c)
  }
  for (const dayAppointments of Object.values(appointmentsByDay)) {
    dayAppointments.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()

  const cells = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayKey = localDateKey(new Date())
  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2>{monthLabel}</h2>
        <button
          type="button"
          onClick={() => setMonthDate(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          type="button"
          className="calendar-today-btn"
          onClick={() => {
            const d = new Date()
            d.setDate(1)
            setMonthDate(d)
          }}
        >
          Today
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="calendar-weekday">
            {wd}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="calendar-cell empty" />
          }
          const key = `${year}-${pad(month + 1)}-${pad(day)}`
          const dayAppointments = appointmentsByDay[key] ?? []
          return (
            <div
              key={key}
              className={'calendar-cell' + (key === todayKey ? ' today' : '')}
            >
              <div className="calendar-date">{day}</div>
              <div className="calendar-appointments">
                {dayAppointments.map((c) => (
                  <div
                    key={c.id}
                    className="calendar-appointment"
                    title={`${c.name} — ${serviceLabels(services, c.services)}${c.address ? ` — ${c.address}` : ''}`}
                  >
                    <span className="appointment-time">
                      {formatTime(c.scheduledAt)}
                    </span>
                    <span className="appointment-name">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
