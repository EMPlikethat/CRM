import { useState } from 'react'
import { formatCurrency } from '../data/quote'
import { EXPENSE_CATEGORIES } from '../data/expenseCategories'

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function emptyForm() {
  return {
    description: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    date: todayISO(),
    contactId: '',
  }
}

export default function ExpensesView({ contacts, expenses, onAdd, onDelete }) {
  const [form, setForm] = useState(emptyForm)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount || !form.date) return
    await onAdd({
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      contactId: form.contactId || null,
    })
    setForm(emptyForm())
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const contactById = Object.fromEntries(contacts.map((c) => [c.id, c]))

  return (
    <div className="expenses-view">
      <h2>Expenses</h2>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          Description
          <input
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            required
          />
        </label>
        <label>
          Amount ($)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={(e) => updateField('date', e.target.value)}
            required
          />
        </label>
        <label>
          Job (optional)
          <select
            value={form.contactId}
            onChange={(e) => updateField('contactId', e.target.value)}
          >
            <option value="">— General expense —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.address ? `${c.address} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Add expense</button>
      </form>

      <div className="expenses-total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      {expenses.length === 0 ? (
        <p className="empty-state">No expenses logged yet.</p>
      ) : (
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Job</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => {
              const linkedContact = expense.contactId ? contactById[expense.contactId] : null
              return (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td>
                    {expense.contactId
                      ? (linkedContact ? linkedContact.name : 'Deleted job')
                      : '—'}
                  </td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="note-delete"
                      onClick={() => onDelete(expense.id)}
                      aria-label="Delete expense"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
