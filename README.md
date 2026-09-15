# MCH CRM

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
    multi-user/role system - see "Planned next milestones."
12. **Deployment-ready as one process** — in production
    (`NODE_ENV=production`, i.e. `npm start`), the same Express server
    that serves the API also serves the built frontend
    (`express.static('dist')` + an index.html fallback), so the whole app
    is one deployable service instead of two. See "Deploying" below.

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

**Frontend** (`src/`):
- `src/data/api.js` — a small `fetch` wrapper (`get`/`post`/`put`/`del`)
  every other data file builds on.
- `src/data/contacts.js` / `src/data/services.js` — one function per API
  call (`fetchContacts`, `createContact`, `saveContactUpdate`,
  `removeContact`, and the equivalents for services). `services.js` also
  still exports the pure helpers `findService`/`serviceLabels`.
- `src/data/stages.js` — the pipeline stage definitions, used by the form,
  the table, and the board. Change the business process here.
- `src/data/quote.js` — turns a contact's selected services + measurements
  into a priced line-item breakdown, using the current rates. Only used
  for the live in-progress preview now (`ContactForm.jsx`) - the board and
  list read the frozen `quote` already saved on each contact instead.
- `src/data/formatSchedule.js` — formats a scheduled datetime for display.
- `src/data/auth.js` — `fetchAuthStatus`/`setupAccount`/`login`/`logout`.
- `src/components/AuthGate.jsx` — the sign-in screen; doubles as the
  one-time account-creation form when `needsSetup` is true.
- `src/components/ContactForm.jsx` — add-contact form. Also doubles as the
  edit form: pass it an `editingContact` and it pre-fills, changes its
  submit handler to `onSave` instead of `onAdd`, and shows Cancel/Delete.
- `src/components/ContactList.jsx` — contact table with inline stage
  editing and delete; click a name to edit.
- `src/components/PipelineBoard.jsx` — Kanban-style board, one column per
  stage, drag-and-drop to change a contact's stage.
- `src/components/ServiceManager.jsx` — add/rename/reprice/delete services.
- `src/components/CalendarView.jsx` — month-grid view of every contact's
  `scheduledAt`, grouped by day.
- `src/App.jsx` — checks auth status first; renders `AuthGate` until
  signed in, then fetches contacts/services, calls the API for every
  mutation and updates state from the response, and toggles between
  board/list/calendar/services views.
- `vite.config.js` — proxies `/api/*` to `http://localhost:3001` in dev,
  so the browser sees same-origin requests and no CORS setup is needed.

## Planned next milestones

1. Deal-level notes/activity log per contact.
2. Multi-user accounts (an employee login separate from the owner's, with
   its own credentials) - today there's exactly one account for the whole
   business, created once at setup.
3. A shared/database-backed session store, if this ever needs to run as
   more than one server instance.
4. Actually deploying it (see "Deploying" above) - everything's in place,
   this just needs your own hosting account.
