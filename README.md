# Softwash CRM

A learning project: a CRM for a softwashing/pressure washing business, built
step by step in React.

## Current milestone: contacts CRUD

- Add/view/delete contacts (leads)
- Move a contact through pipeline stages (Lead → Quoted → Scheduled → Job
  Complete → Invoiced → Paid)
- Data persists to `localStorage` — no backend yet, on purpose, so the first
  milestone stays focused on React fundamentals (components, state, forms).

## Project layout

- `src/data/stages.js` — the pipeline stage definitions, used by both the
  contact form and the table. Change the business process here.
- `src/data/contacts.js` — localStorage read/write. This is the one file
  you'd swap out to move to a real backend (e.g. Supabase/Postgres) later.
- `src/components/ContactForm.jsx` — add-contact form.
- `src/components/ContactList.jsx` — contact table with inline stage editing
  and delete.
- `src/App.jsx` — wires state together and owns the source-of-truth array.

## Running it

```bash
npm install
npm run dev
```

## Planned next milestones

1. Pipeline board view — group contacts by stage as draggable columns
   instead of a flat table.
2. Deal-level notes/activity log per contact.
3. Swap localStorage for a real backend + auth (Supabase or a small
   Node/Express API) once the localStorage version feels limiting.
