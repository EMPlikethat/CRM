import { useEffect, useState } from 'react'
import { formatCurrency } from './data/quote'

function getTokenFromPath() {
  return window.location.pathname.split('/pay/')[1]?.split('?')[0] ?? ''
}

// Standalone public page - a customer opens this from a link you send
// them, no login involved. Deliberately doesn't import anything from
// App.jsx/data/contacts.js: those all assume an authenticated session.
export default function PayInvoice() {
  const token = getTokenFromPath()
  const [invoice, setInvoice] = useState(null)
  const [error, setError] = useState(null)
  const [paying, setPaying] = useState(false)
  const justPaid = new URLSearchParams(window.location.search).get('paid') === '1'

  useEffect(() => {
    fetch(`/api/pay/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setInvoice)
      .catch(() =>
        setError("We couldn't find that invoice. Double-check the link, or contact us directly."),
      )
  }, [token])

  async function handlePay() {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch(`/api/pay/${token}/checkout`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong starting checkout.')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setPaying(false)
    }
  }

  if (error) {
    return (
      <main className="pay-page">
        <p className="status-message error">{error}</p>
      </main>
    )
  }

  if (!invoice) {
    return (
      <main className="pay-page">
        <p className="status-message">Loading…</p>
      </main>
    )
  }

  const isPaid = invoice.isPaid || justPaid

  return (
    <main className="pay-page">
      <div className="pay-card">
        <h1>Invoice {invoice.invoice.number}</h1>
        <p className="pay-meta">
          Billed to {invoice.name}
          {invoice.address ? ` — ${invoice.address}` : ''}
        </p>

        <div className="pay-lines">
          {invoice.quote.lineItems.map((item) => (
            <div key={item.serviceId} className="pay-line">
              <span>{item.label}</span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="pay-total">
          <span>Total</span>
          <span>{formatCurrency(invoice.quote.total)}</span>
        </div>
        <p className="pay-due">Due {invoice.invoice.dueDate}</p>

        {isPaid ? (
          <p className="pay-paid-note">✓ This invoice has been paid. Thank you!</p>
        ) : (
          <button type="button" className="pay-button" onClick={handlePay} disabled={paying}>
            {paying ? 'Redirecting…' : `Pay ${formatCurrency(invoice.quote.total)} now`}
          </button>
        )}
      </div>
    </main>
  )
}
