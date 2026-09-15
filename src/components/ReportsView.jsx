import { useState } from 'react'
import { formatCurrency } from '../data/quote'

function inRange(date, start, end) {
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

function formatMargin(profit, revenue) {
  if (revenue <= 0) return '—'
  return `${((profit / revenue) * 100).toFixed(0)}%`
}

export default function ReportsView({ contacts, expenses }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Profitability is cash-based: revenue only counts jobs actually paid
  // (payment.amount), not just quoted or invoiced - money quoted but
  // never collected isn't profit. Expenses count everything in range,
  // job-linked or general overhead, since both are real costs.
  const paidJobs = contacts.filter((c) => c.stage === 'paid' && c.payment)
  const jobsInRange = paidJobs.filter((c) => inRange(c.payment.date, startDate, endDate))
  const expensesInRange = expenses.filter((e) => inRange(e.date, startDate, endDate))

  const totalRevenue = jobsInRange.reduce((sum, c) => sum + c.payment.amount, 0)
  const totalExpenses = expensesInRange.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  const expensesByContact = {}
  for (const expense of expenses) {
    if (!expense.contactId) continue
    expensesByContact[expense.contactId] = (expensesByContact[expense.contactId] ?? 0) + expense.amount
  }

  const jobRows = jobsInRange
    .map((c) => {
      const jobExpenses = expensesByContact[c.id] ?? 0
      const profit = c.payment.amount - jobExpenses
      return { contact: c, revenue: c.payment.amount, jobExpenses, profit }
    })
    .sort((a, b) => b.contact.payment.date.localeCompare(a.contact.payment.date))

  return (
    <div className="reports-view">
      <h2>Reports</h2>

      <div className="report-filters">
        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        {(startDate || endDate) && (
          <button type="button" className="cancel-btn" onClick={() => { setStartDate(''); setEndDate('') }}>
            Clear
          </button>
        )}
      </div>

      <div className="report-summary">
        <div className="report-stat">
          <span className="report-stat-label">Revenue</span>
          <span className="report-stat-value">{formatCurrency(totalRevenue)}</span>
          <span className="report-stat-sub">{jobsInRange.length} job{jobsInRange.length === 1 ? '' : 's'} paid</span>
        </div>
        <div className="report-stat">
          <span className="report-stat-label">Expenses</span>
          <span className="report-stat-value">{formatCurrency(totalExpenses)}</span>
          <span className="report-stat-sub">{expensesInRange.length} logged</span>
        </div>
        <div className={`report-stat ${netProfit >= 0 ? 'good' : 'warning'}`}>
          <span className="report-stat-label">Net profit</span>
          <span className="report-stat-value">{formatCurrency(netProfit)}</span>
          <span className="report-stat-sub">{formatMargin(netProfit, totalRevenue)} margin</span>
        </div>
      </div>

      <h3>Profitability by job</h3>
      {jobRows.length === 0 ? (
        <p className="empty-state">No paid jobs in this range yet.</p>
      ) : (
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date paid</th>
              <th>Job</th>
              <th>Revenue</th>
              <th>Expenses</th>
              <th>Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {jobRows.map(({ contact, revenue, jobExpenses, profit }) => (
              <tr key={contact.id}>
                <td>{contact.payment.date}</td>
                <td>{contact.address ? `${contact.address} — ${contact.name}` : contact.name}</td>
                <td>{formatCurrency(revenue)}</td>
                <td>{formatCurrency(jobExpenses)}</td>
                <td>{formatCurrency(profit)}</td>
                <td>{formatMargin(profit, revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
