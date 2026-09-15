# Softwash CRM

A learning project: a CRM for a softwashing/pressure washing business, built
step by step in React.

## Current milestones

1. **Contacts CRUD** — add/view/delete contacts (leads), data persisted to
   `localStorage`.
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
   you type: line item + detail + subtotal per service, plus a total. The
   price is always computed from the current rates, never stored as a
   stale number — same idea as a spreadsheet formula vs. a hardcoded cell.
5. **Manage services** — a "Manage services" screen lets you rename
   services, change their rates, add a brand new service (priced per sq ft
   or per linear ft), or delete one, all without touching code. Services
   are stored in `localStorage` alongside contacts rather than hardcoded,
   so this list is the live source every other view reads from. Starting
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

No backend yet, on purpose — the first milestones stay focused on React
fundamentals (components, state, forms, native browser APIs) before adding
the complexity of a server.

## Project layout

- `src/data/stages.js` — the pipeline stage definitions, used by the form,
  the table, and the board. Change the business process here.
- `src/data/services.js` — localStorage read/write for the services list
  (mirrors `contacts.js`). Seeded with today's services/rates the first
  time the app runs; after that, edits made in "Manage services" persist.
- `src/data/quote.js` — turns a contact's selected services + measurements
  into a priced line-item breakdown. The only place pricing math happens.
- `src/data/formatSchedule.js` — formats a scheduled datetime for display.
- `src/data/contacts.js` — localStorage read/write. This is the one file
  you'd swap out to move to a real backend (e.g. Supabase/Postgres) later.
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
- `src/App.jsx` — wires state together, owns the source-of-truth arrays
  (contacts and services), and toggles between board/list/calendar/services
  views.

## Running it

```bash
npm install
npm run dev
```

## Planned next milestones

1. Deal-level notes/activity log per contact.
2. Swap localStorage for a real backend + auth (Supabase or a small
   Node/Express API) once the localStorage version feels limiting — this
   is also when a service price change should probably stop retroactively
   changing already-quoted jobs (snapshot the price at quote time).
