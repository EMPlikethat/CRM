import { Resend } from 'resend'

let client = null

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

const FROM = process.env.FROM_EMAIL || 'My Clean Homie <onboarding@resend.dev>'

function currency(amount) {
  return `$${amount.toFixed(2)}`
}

function buildHtml(contact, payLink) {
  const lines = contact.quote.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0; color:#333;">${item.label}</td>
          <td style="padding:6px 0; text-align:right; color:#333;">${currency(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">Invoice ${contact.invoice.number}</h2>
      <p style="color:#555;">
        Hi ${contact.name}, thanks for choosing My Clean Homie. Here's your invoice
        for the work${contact.address ? ` at ${contact.address}` : ''}.
      </p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        ${lines}
        <tr>
          <td style="padding-top:10px; border-top:1px solid #ddd; font-weight:bold;">Total</td>
          <td style="padding-top:10px; border-top:1px solid #ddd; text-align:right; font-weight:bold;">
            ${currency(contact.quote.total)}
          </td>
        </tr>
      </table>
      <p style="color:#555; font-size:14px;">Due ${contact.invoice.dueDate}</p>
      <p style="margin:24px 0;">
        <a href="${payLink}"
           style="background:#2563eb; color:#fff; padding:12px 22px; border-radius:6px;
                  text-decoration:none; display:inline-block; font-weight:600;">
          Pay ${currency(contact.quote.total)} now
        </a>
      </p>
      <p style="color:#888; font-size:12px;">Or copy this link: ${payLink}</p>
    </div>
  `
}

// Never throws - callers get back { sent: false, reason } instead, so a
// missing API key or a down email provider never breaks the CRM save
// that triggered this (see the PUT /api/contacts/:id fire-and-forget
// call in server/index.js).
export async function sendInvoiceEmail(contact, payLink) {
  const resend = getResend()
  if (!resend) return { sent: false, reason: 'not-configured' }
  if (!contact.email) return { sent: false, reason: 'no-email' }
  if (!contact.invoice) return { sent: false, reason: 'no-invoice' }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: contact.email,
      subject: `Invoice ${contact.invoice.number} — ${currency(contact.quote.total)} due ${contact.invoice.dueDate}`,
      html: buildHtml(contact, payLink),
    })
    if (error) return { sent: false, reason: 'send-failed', message: error.message }
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: 'send-failed', message: err.message }
  }
}
