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

No backend yet, on purpose — the first milestones stay focused on React
fundamentals (components, state, forms, native browser APIs) before adding
the complexity of a server.

## Project layout

- `src/data/stages.js` — the pipeline stage definitions, used by the form,
  the table, and the board. Change the business process here.
- `src/data/contacts.js` — localStorage read/write. This is the one file
  you'd swap out to move to a real backend (e.g. Supabase/Postgres) later.
- `src/components/ContactForm.jsx` — add-contact form.
- `src/components/ContactList.jsx` — contact table with inline stage editing
  and delete.
- `src/components/PipelineBoard.jsx` — Kanban-style board, one column per
  stage, drag-and-drop to change a contact's stage.
- `src/App.jsx` — wires state together, owns the source-of-truth array, and
  toggles between board/list views.

## Running it

```bash
npm install
npm run dev
```

## Planned next milestones

1. Deal-level notes/activity log per contact.
2. Swap localStorage for a real backend + auth (Supabase or a small
   Node/Express API) once the localStorage version feels limiting.
