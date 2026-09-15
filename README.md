# My Clean Homie

A learning project: a CRM for a softwashing/pressure washing business, built
step by step in React with a real Node/Express + SQLite backend.

## Current milestones

1. **Contacts CRUD** — add/view/delete contacts (leads).
2. **Pipeline board** — contacts grouped into columns by stage (Lead →
   Quoted → Scheduled → Job Complete → Invoiced → Paid), draggable between
   columns using the browser's native HTML5 drag-and-drop API. A "List"
   toggle switches to the flat table view; both read/write the same
   underlying state, so a change in one shows up in the other.
3. **Multiple services + scheduling** — a contact can select any combination
   of services (checkboxes, not a single dropdown), and gets a scheduled
   appointment time editable inline from either view.
4. **Itemized pricing** — each service has a pricing rule (per sq ft, or
   per linear ft with a bottom/top-story split for gutters). Checking a
   service reveals its measurement inputs, and a quote breaks down live as
   you type: line item + detail + subtotal per service, plus a total.
   While you're still filling out the form, it's computed live from
   today's rates - see milestone 8 for what happens once you save.
5. **Manage services** — a "Manage services" screen lets you rename
   services, change their rates, add a brand new service (priced per sq ft
   or per linear ft), or delete one, all without touching code. Starting
   rates: Complete Roof Soft Wash $0.50/sq ft, Pressure Washing Driveway
   and Entryway $0.40/sq ft, Gutter Debris Removal $1.50/linear ft (bottom
   story) or $2.50/linear ft (top story).
6. **Appointment calendar** — a month-grid "Calendar" view shows every
   scheduled contact on its date, built from the same `scheduledAt` field
   the board and list already edit — nothing new to enter, this is just
   another way of looking at the same data.
7. **Edit an existing contact** — click a contact's name (board card or
   list row) to open it in an editable form, pre-filled with everything
   including services and measurements. Save recalculates the quote,
   Cancel discards changes, and there's a Delete right there too.
8. **Real backend** — contacts and services now live in a SQLite database
   behind a small Express API, not in the browser's `localStorage`. The
   React app fetches on load and calls the API for every add/edit/delete.
   This is the actual client-server split every real app needs: the data
   now lives on a server, not in one browser tab on one device.
9. **Price snapshotting** — saving a contact (add or edit) freezes the
   computed quote onto that contact as `quote: { lineItems, total }`,
   stored in its own column. Every view (board, list) reads that frozen
   value instead of recalculating from the current service rates. Editing
   a rate in "Manage services" now only affects *new* contacts and any
   contact you explicitly open and re-save - it can no longer silently
   change the price on a job already sitting in your pipeline. Re-saving
   an existing contact deliberately re-quotes it at today's rates; that's
   the one and only way an old contact's price changes.
10. **Email** — contacts now have an email field alongside phone/address,
    shown in the form and the list. (Useful for later, when the planned
    scanner/calculator sends a quote by text and email — see below.)
11. **Login (single-admin auth)** — every `/api/contacts` and
    `/api/services` route now requires a signed-in session; hitting the
    app with no session shows a sign-in screen instead of your data. The
    very first time the app runs, before any account exists, that screen
    is a one-time "Create the admin account" form instead of a login -
    once that account is created, the door closes and only login works
    from then on (no open sign-up). Sessions are a signed, `httpOnly`
    cookie (`express-session`); passwords are hashed with Node's built-in
    `crypto.scrypt`, never stored in plain text. This is deliberately
    single-tenant - one account for the business owner, not a
    multi-user/role system - see "Other planned work" below
12. **Deployment-ready as one process** — in production
    (`NODE_ENV=production`, i.e. `npm start`), the same Express server
    that serves the API also serves the built frontend
    (`express.static('dist')` + an index.html fallback), so the whole app
    is one deployable service instead of two. See "Deploying" below.
13. **Dashboard** — redesigned as a "Today" action screen rather than a
    revenue-by-stage summary: five cards - Jobs scheduled today (+
    expected revenue), Follow-ups due (not tracked yet, see below),
    New leads today, Estimates pending (+ potential revenue), and
    Unpaid invoices (+ amount owed, the one card with a status-warning
    accent since it's real money owed). Each card (except Follow-ups)
    jumps to the relevant view on click. Built entirely from data that
    already exists. Now the default screen on load. Follow-ups shows
    "0 due today / Not tracked yet" and isn't clickable - there's no
    follow-ups entity yet (roadmap item 11), so that card is honest
    about being a placeholder rather than faking a number.
14. **Properties (address-anchored history)** — every job now links to a
    `properties` row (matched/created from its address, loosely
    normalized so "123 Main St" and "123 main st." resolve to the same
    property) instead of being anchored to the owner's name. A house
    keeps its full history across however many different owners it's
    had - the durable record is the address, not whoever lived there for
    one visit. This is the start of roadmap item 4, resolved in the
    address-primary direction rather than the customer-primary one
    originally proposed.
15. **Search** — a "Search" screen groups every job by property and lets
    you look one up by address or owner name: pick a house and see its
    whole history - each visit's date, who owned it then, what was
    charged, and whether it was paid (a green "Paid" badge; anything
    else shows its current pipeline stage). Click a name to jump straight
    into editing that job. Pure client-side grouping over the contacts
    already loaded - no new API endpoint needed.
16. **Invoices & Payments** — moving a job's stage to "Invoiced" now
    generates a real invoice: a sequential number (`INV-1001`, ...,
    tracked server-side so numbers never repeat or go backwards even
    across deletes), an issue date, and a due date (30 days out by
    default, editable per-job in the edit form). Moving to "Paid"
    generates a payment record - date, method, amount - with the amount
    pre-filled from the quote total and the method left blank for you to
    fill in (there's no way to know *how* someone paid without being
    told). Skipping straight from an earlier stage to "Paid" still
    generates both records, in order, so nothing is ever "paid" without
    also being "invoiced." Each is only ever created once per job -
    later saves never regenerate or overwrite an existing invoice number
    or payment date. Search now shows the real payment method/date (or
    the invoice number and due date, if still unpaid) instead of just a
    stage badge, and the Dashboard's Unpaid card flags overdue invoices.
17. **Online payment link** — every invoice gets a public "Pay Invoice"
    page at `/pay/<token>` (a 192-bit random token, not the sequential
    invoice number, so one link can't be used to guess another) showing
    the line items, total, and due date, with a "Pay now" button. That
    button starts a Stripe Checkout session; a webhook
    (`/api/stripe/webhook`) marks the job Paid automatically the moment
    Stripe confirms payment - no manual step, which was the actual point.
    The edit form shows a "Copy link" button next to the invoice, so you
    can text it yourself; see the next milestone for automated email.
    Requires your own Stripe account and two environment variables
    (`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, documented in
    `.env.example`) - without them the "Pay now" button shows a clear
    "not set up yet" message instead of erroring, so the rest of the app
    works fine either way.
18. **Automated invoice email** — the moment a job's stage becomes
    Invoiced (or skips straight to Paid), if the contact has an email
    address on file, the invoice - line items, total, due date, pay
    link - sends automatically, no button to click. A "Send email"
    button also appears in the edit form next to "Copy link" (only when
    an email address exists) to resend it any time. Sending happens
    fire-and-forget, after the stage-change save already succeeded and
    responded - a slow or misconfigured email provider can never delay
    or fail the actual data save, which is what matters. Runs on Resend;
    needs its own `RESEND_API_KEY` (and optionally `FROM_EMAIL`, both in
    `.env.example`) - without it, sending fails with a clear message
    instead of erroring, same pattern as Stripe. SMS is deliberately not
    built - it needs a separate Twilio account, a purchased phone
    number, a per-message fee, and (for US numbers) A2P 10DLC business
    registration with carriers before texts reliably deliver; see "Other
    planned work" below.

## Roadmap

The full feature list, and where each one stands:

| # | Feature | Status |
|---|---------|--------|
| 1 | Dashboard | **Done** (milestone 13) |
| 2 | Leads | Exists as a pipeline stage/filter on Contacts, not a separate entity yet |
| 3 | Customers | Same as above - "Customer" = later-stage contact |
| 4 | Properties | **Done** (milestone 14) - address-anchored, see below |
| 5 | Map | Not started |
| 6 | Estimates | Exists as the quote system (milestones 4, 9) under a different name |
| 7 | Jobs | Not started as a distinct entity - currently a pipeline stage |
| 8 | Scheduling | **Done** - the Calendar view (and inline scheduling on board/list) |
| 9 | Invoices | **Done** (milestones 16-17) - plus a public pay link |
| 10 | Payments | **Done** (milestones 16-17) - online (Stripe) or manual |
| 11 | Follow-ups | Not started |
| 12 | Photos | Not started |
| 13 | Notes | Not started |
| 14 | Expenses | Not started |
| 15 | Profitability | Not started - needs Jobs + Invoices + Expenses first |
| 16 | Reports | Not started - needs most of the above first |
| 17 | Service/pricing management | **Done** (milestone 5) |
| 18 | Settings | Not started |

**Build order** (later items depend on earlier ones):
1. ~~Dashboard~~ — done.
2. ~~Properties~~ — done, resolved as address-anchored (see milestone 14):
   a property can have many jobs/owners over time; a job belongs to
   exactly one property, found-or-created from its address.
3. ~~Invoices → Payments~~ — done (milestone 16). "Jobs" as its own
   distinct entity (separate from the pipeline stage) is the one piece of
   this step not done - stays a stage on the contact for now.
4. Notes, Follow-ups, Photos (activity/attachments on a property or job).
5. Expenses → Profitability → Reports (needs Jobs + Invoices to exist).
6. Map, Settings (fairly independent, can slot in anywhere) - Properties
   already has an address to geocode when Map gets built.

## Running it locally

Two processes, in separate terminals:

```bash
npm install
npm run server   # API on http://localhost:3001 (creates server/data.db)
npm run dev      # frontend on http://localhost:5173, proxies /api to the server
```

The frontend won't show data until the server is running — it shows a
"couldn't reach the API server" message if it can't connect. The first
time you open it, you'll get the "Create the admin account" screen -
that account is the only login this CRM will have.

## Deploying

This wasn't done as part of this session — it needs your own account on a
host — but the app is set up to make it a small number of steps:

1. Pick a host that runs a long-lived Node process (Railway, Render, Fly.io
   are common free/cheap options - this won't work on a purely static host
   like GitHub Pages, since the API server needs to actually run).
2. Connect this repo to it.
3. Set the build command to `npm install && npm run build` and the start
   command to `npm start`.
4. Set one environment variable: `SESSION_SECRET`, a long random string.
   Generate one locally with:
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   (`.env.example` documents this - copy it to `.env` for local testing of
   production mode; never commit `.env` itself, it's gitignored.)
5. Deploy. The host gives you a URL; the first visit there is your
   "Create the admin account" screen, same as local.
6. To turn on the customer "Pay now" button, also set `STRIPE_SECRET_KEY`
   and `STRIPE_WEBHOOK_SECRET` (both explained in `.env.example`) - the
   webhook one specifically needs your deployed URL, so it can only be
   created after step 5. Skippable: the app runs fully without it, just
   without online payment.

One limitation worth knowing before you rely on this: sessions are held
in the server's memory (`express-session`'s default store), which only
works correctly with a single running server instance and forgets every
signed-in session on restart/redeploy. Fine for one business owner on one
instance; if this ever needs to scale to multiple server instances, swap
in a real session store (e.g. one backed by the database) at that point.

## Project layout

**Backend** (`server/`):
- `server/db.js` — opens `server/data.db` (created automatically) using
  Node's built-in `node:sqlite`, creates the `contacts` and `services`
  tables if they don't exist, and seeds them with demo data the first
  time. `services`/`measurements`/`quote` are stored as JSON text
  columns, since SQLite has no native array/object type — a common,
  legitimate pattern (Postgres's JSONB column works the same way).
- `server/index.js` — the Express app: REST endpoints
  (`GET/POST /api/contacts`, `PUT/DELETE /api/contacts/:id`, and the same
  for `/api/services`) that read/write the database and return JSON, plus
  `/api/auth/*` (see `server/auth.js`) and, in production, static-file
  serving for the built frontend.
- `server/auth.js` — `hashPassword`/`verifyPassword`, built on Node's
  built-in `crypto.scrypt` - no extra dependency, no native module to
  compile.
- `server/properties.js` — `normalizeAddress`/`findOrCreateProperty`, the
  address-matching logic every contact write goes through so jobs at the
  same house link to the same property regardless of small typos in how
  the address was entered.
- `server/invoices.js` — `createInvoice`/`createPayment`. Invoice numbers
  come from a single-row `invoice_counter` table (starts at 1001),
  incremented once per invoice and never reused. Each invoice also gets
  a random `payToken` (192 bits), what the public pay page is keyed on.
- `server/stripe.js` — `getStripe()`, a thin wrapper that returns `null`
  when `STRIPE_SECRET_KEY` isn't set so every caller degrades to a clear
  "not configured" response instead of throwing.
- Public routes in `server/index.js` (no `requireAuth`, since the
  customer isn't a CRM user): `GET /api/pay/:token` (invoice details),
  `POST /api/pay/:token/checkout` (starts a Stripe Checkout session), and
  `POST /api/stripe/webhook` (marks the job Paid on
  `checkout.session.completed` - registered with its own
  `express.raw()` body parser *before* the app's blanket
  `express.json()`, since Stripe's signature check needs the raw body).
- `server/email.js` — `sendInvoiceEmail(contact, payLink)`, wrapping the
  Resend SDK the same way `stripe.js` wraps Stripe's: returns
  `{ sent: false, reason }` instead of throwing when unconfigured, so
  callers (the PUT handler's fire-and-forget auto-send, and the
  `POST /api/contacts/:id/send-invoice-email` manual-resend route) never
  need a try/catch just to keep the app working without it.

**Frontend** (`src/`):
- `src/data/api.js` — a small `fetch` wrapper (`get`/`post`/`put`/`del`)
  every other data file builds on.
- `src/data/contacts.js` / `src/data/services.js` — one function per API
  call (`fetchContacts`, `createContact`, `saveContactUpdate`,
  `removeContact`, `sendInvoiceEmail`, and the equivalents for services).
  `services.js` also still exports the pure helpers
  `findService`/`serviceLabels`.
- `src/data/stages.js` — the pipeline stage definitions, used by the form,
  the table, and the board. Change the business process here.
- `src/data/quote.js` — turns a contact's selected services + measurements
  into a priced line-item breakdown, using the current rates. Only used
  for the live in-progress preview now (`ContactForm.jsx`) - the board and
  list read the frozen `quote` already saved on each contact instead.
- `src/data/formatSchedule.js` — formats a scheduled datetime for display.
- `src/data/auth.js` — `fetchAuthStatus`/`setupAccount`/`login`/`logout`.
- `src/data/properties.js` — `groupByProperty`/`filterPropertyGroups`, pure
  functions over the already-loaded contacts array (grouped by
  `propertyId`, newest job first). No API call - this is client-side
  reshaping of data the app already has.
- `src/components/AuthGate.jsx` — the sign-in screen; doubles as the
  one-time account-creation form when `needsSetup` is true.
- `src/components/ContactForm.jsx` — add-contact form. Also doubles as the
  edit form: pass it an `editingContact` and it pre-fills, changes its
  submit handler to `onSave` instead of `onAdd`, and shows Cancel/Delete.
  Once a job has an `invoice`/`payment` (server-generated - see
  `server/invoices.js`), shows an editable panel for each: due date on
  the invoice, date/method/amount on the payment, plus (while unpaid)
  "Copy link" and, if the contact has an email on file, "Send email" to
  resend the invoice on demand. Number, issue date, and the fact that
  either exists at all are never set from this form - only the server
  decides when one gets created.
- `src/PayInvoice.jsx` / `src/main.jsx` — the public customer-facing pay
  page. Not part of the authenticated app: `main.jsx` checks
  `window.location.pathname` before rendering anything and renders this
  instead of `App` for any `/pay/*` path - a plain conditional rather
  than pulling in a router library for one extra route.
- `src/components/ContactList.jsx` — contact table with inline stage
  editing and delete; click a name to edit.
- `src/components/PipelineBoard.jsx` — Kanban-style board, one column per
  stage, drag-and-drop to change a contact's stage.
- `src/components/ServiceManager.jsx` — add/rename/reprice/delete services.
- `src/components/CalendarView.jsx` — month-grid view of every contact's
  `scheduledAt`, grouped by day.
- `src/components/Dashboard.jsx` — the "Today" screen: five cards (Jobs,
  Follow-ups, New leads, Estimates, Unpaid), each computed from
  `contacts`/`services`, clickable via an `onNavigate` callback that
  switches the active view. Unpaid also flags how many invoices are past
  their due date.
- `src/components/PropertySearch.jsx` — search by address or owner name,
  see every property's full job history with a Paid/stage badge per job
  (plus the real payment method/date once paid, or the invoice number
  and due date while still owed), click a name to edit it.
- `src/App.jsx` — checks auth status first; renders `AuthGate` until
  signed in, then fetches contacts/services, calls the API for every
  mutation and updates state from the response, and toggles between
  dashboard/board/list/calendar/search/services views.
- `vite.config.js` — proxies `/api/*` to `http://localhost:3001` in dev,
  so the browser sees same-origin requests and no CORS setup is needed.

## Other planned work (not on the 18-item roadmap)

1. Multi-user accounts (an employee login separate from the owner's, with
   its own credentials) - today there's exactly one account for the whole
   business, created once at setup.
2. A shared/database-backed session store, if this ever needs to run as
   more than one server instance.
3. Actually deploying it (see "Deploying" above) - everything's in place,
   this just needs your own hosting account.
4. Automated SMS sending of the pay link (email is done - milestone 18;
   right now you'd copy/text the link yourself) - deliberately deferred,
   since it needs its own Twilio account, a purchased phone number, a
   per-message fee, and (for US numbers) A2P 10DLC business registration
   with carriers before texts reliably deliver.
