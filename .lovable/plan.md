## Diagnosis

The main ticket list/board search (toolbar input on Project Tickets and Board) already uses **direct substring matching** — both server-side (`ILIKE '%q%'` on `title` and `formatted_id` inside the `list_project_tickets` RPC) and client-side (`title.toLowerCase().includes(q)`). Searching `Damin` there would NOT return `Admin`, and `504` would NOT return `405`.

The fuzzy behavior the user is seeing comes from the **cmdk-powered combobox pickers** used inside ticket creation:

- `src/features/epics/EpicSelect.tsx` — Epic picker (search/create)
- `src/features/tickets/ParentTicketSelect.tsx` — Parent ticket picker

Both wrap shadcn `<Command>`, which by default uses cmdk's built-in fuzzy/score-based filter. That filter scores any item that shares characters with the query above zero, so:

- Typing `Damin` returns items containing `Admin` (4 shared chars, transposable distance).
- Typing `504` returns items containing `405` (digit overlap scores > 0).

## Fix

Disable cmdk's fuzzy scorer on both pickers and replace it with a strict, case-insensitive substring filter.

### Changes

**1. `src/features/epics/EpicSelect.tsx`**
- On `<Command>`, pass a `filter` prop:
  ```ts
  filter={(value, search) =>
    value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
  }
  ```
- Keep the existing `value={e.epic_name ?? ""}` on each `CommandItem` so the filter matches against the epic name (and against `__create_<search>` for the create row, which always passes because it contains the query).

**2. `src/features/tickets/ParentTicketSelect.tsx`**
- Same `filter` prop on `<Command>`.
- Each `CommandItem` already uses `value={`${opt.formatted_id} ${opt.title}`}`, so a substring search will correctly match either the ticket code (e.g. `504`) or the title — and will NOT match unrelated codes like `405`.

### Out of scope

- The Project Tickets toolbar search, Board search, and Projects list search are already direct substring matches — no changes needed.
- No DB/RPC changes; no schema migration.

### Verification

- Open the ticket creation row → Epic picker → type `Damin` → should show only epics containing `damin` (case-insensitive).
- Same picker → type `504` → should show only items containing `504`, not `405`.
- Parent ticket picker → repeat both checks against ticket codes and titles.
