## Two-tier status model

Today every ticket has a single `status_id` (the column on the Kanban board). We'll split this into:

- **Discipline status** — one for FE, one for BE. Each developer working on that discipline shares the same status. Drawn from a small fixed list: `To-do`, `In progress`, `Done`.
- **Project status** — the existing Admin-defined status list (Backlog / Active / Done categories). Auto-derived from the FE+BE discipline statuses, but a PMBA can pin/override it.

A ticket can therefore be `BE: To-do`, `FE: Done`, `Project: In progress` simultaneously.

---

## Data model changes

Add to `tickets`:
- `fe_status` (text, default `'todo'`) — values: `todo` | `in_progress` | `done`
- `be_status` (text, default `'todo'`) — same values
- `project_status_override` (boolean, default `false`) — when true, PMBA has manually set `status_id` and auto-derivation is suspended

Keep the existing `status_id` column — it now represents the **project status** (the board column).

### Auto-derivation rule (applied via DB trigger on `tickets` insert/update of fe_status/be_status, only when `project_status_override = false`)

```text
both done            → first status in 'done'   category (lowest position)
either in_progress   → first status in 'active' category
both todo            → first status in 'backlog' category
```

The trigger looks up the appropriate status by category + lowest position. If the project's PMBA later changes `status_id` directly, set `project_status_override = true`. A "Reset to auto" action clears the override and re-derives.

Discipline statuses are NOT in the Admin > Statuses list — they are a fixed enum, simpler and decoupled.

---

## UI changes

### TicketDetailSheet
- New "Discipline status" section with two segmented controls (FE / BE), each cycling `To-do → In progress → Done`. Visible to all; editable by the assignee for their slot, and by PMBA for both.
- "Project status" stays as today, plus a small "Auto" badge when not overridden, and an "Override" / "Reset to auto" toggle for PMBA.

### Project Kanban board (`ProjectBoard.tsx`)
- Add a small toggle in the toolbar (next to All / My tickets):
  - **Project view** (default) — columns are the Admin statuses, ticket placed by `status_id`. Dragging a card sets `status_id` and `project_status_override = true`.
  - **My view** — columns are the three discipline statuses (`To-do / In progress / Done`). Tickets are filtered to those where the current user is assigned, and grouped by **their** slot's discipline status (FE assignee → `fe_status`; BE assignee → `be_status`; if assigned to both, the ticket appears once per slot). Dragging updates the corresponding discipline status.

### TicketCard
- Show two small chips: `FE · <status>` and `BE · <status>` with subtle color coding (gray / blue / green), only when that slot has assignees.

### My Work page
- Each row already shows the project status. Add the user's own discipline status chip alongside it (based on the row's `slot`).

### TicketsList (table)
- Add `FE status` and `BE status` columns (toggleable via existing column controls if present; otherwise just appended).
- Existing "Group by" dropdown gains `FE status` and `BE status` options.

---

## CSV import

Extend the CSV template with two optional columns: `FE Status`, `BE Status` (values `todo` / `in_progress` / `done`, default `todo`). Project status remains auto-derived on insert.

---

## Files to change

- **Migration** (new): add columns + trigger function `derive_project_status()` + trigger on `tickets`
- `src/features/tickets/useProjectTickets.ts` — select the new columns, expose in `TicketRow`
- `src/features/tickets/TicketCard.tsx` — discipline status chips
- `src/features/tickets/TicketDetailSheet.tsx` — discipline status controls + override toggle
- `src/features/tickets/TicketsList.tsx` — new columns + group-by options
- `src/features/board/ProjectBoard.tsx` — view toggle + per-discipline grouping/drag handler
- `src/features/tickets/ProjectTickets.tsx` — CSV template + import parser
- `src/pages/MyWork.tsx` — discipline status chip
- `src/lib/types.ts` — add `DisciplineStatus` type

No changes to the Admin > Statuses screen (project statuses keep working as today).

## Out of scope

- Notifications when a discipline finishes
- Per-assignee (per-person) status — we agreed on per-discipline only
