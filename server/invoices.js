import crypto from 'node:crypto'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Invoice numbers are sequential and, once issued, never reused - the
// counter only ever moves forward, even if this invoice is later
// edited or its contact deleted. Synchronous read-then-write is safe
// here because node:sqlite's DatabaseSync runs single-threaded, so
// there's no concurrent request that could interleave between them.
function nextInvoiceNumber(db) {
  const row = db.prepare('SELECT nextNumber FROM invoice_counter WHERE id = 1').get()
  db.prepare('UPDATE invoice_counter SET nextNumber = nextNumber + 1 WHERE id = 1').run()
  return `INV-${row.nextNumber}`
}

// Called once, the first time a job's stage reaches "invoiced" (or
// skips straight to "paid") - due date defaults to whatever net-terms
// Settings has configured (30 days out of the box) but is editable
// afterward per-contact, same as the payment method below. payToken is
// what the public "Pay Invoice" page/link is keyed on - 24 random bytes
// (192 bits) so it's unguessable, unlike the sequential invoice number,
// which is never used to look anything up publicly.
export function createInvoice(db) {
  const issueDate = todayISODate()
  const { invoiceDueDays } = db.prepare('SELECT invoiceDueDays FROM settings WHERE id = 1').get()
  return {
    number: nextInvoiceNumber(db),
    issueDate,
    dueDate: addDays(issueDate, invoiceDueDays),
    payToken: crypto.randomBytes(24).toString('hex'),
  }
}

// Called once, the first time a job's stage reaches "paid". Method
// starts blank - there's no way to know how someone paid without
// asking, so this is a placeholder meant to be filled in via the edit
// form right after, not a guess.
export function createPayment(amount) {
  return {
    date: todayISODate(),
    method: '',
    amount: amount ?? 0,
  }
}
