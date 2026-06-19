# My Work (`/my-work`)

**Source:** `src/pages/MyWork.tsx` · **Protected**

## Purpose
Cross-project list of open tickets assigned to the current user, grouped per assignment slot (FE / BE / Project).

## Data
- Reads `ticket_assignees` filtered by `user_id = current user`, joining `tickets` (+ `project`, `status`).
- Each row is flattened into a `Row` containing slot, ticket meta, both discipline statuses, FE/BE estimates and actuals.
- Filters out anything whose `status.category === "done"`.

## Realtime
`useRealtimeReload` subscribes to:
- `ticket_assignees` where `user_id = me`
- `tickets` (all)
- `time_logs` (all)
On any change, `load()` re-runs.

## Row UI
For each assignment:
- `formatted_id` (mono), `displayTitle(title, ticket_type)`, project name and status pill.
- Slot indicator:
  - `Project` → fuchsia "Project" badge
  - `FE` / `BE` → `<DisciplineStatusChip slot status />`
- Numeric column: `formatHours(actual) / formatHours(estimate)` for FE/BE, `—` for Project slot.

## Ticket sheet
- Clicking a row calls `fetchTicketDetail(ticketId)` which loads the ticket plus its assignees (with members) and assembles a full `TicketRow` (defaults, type-narrowed `cr_approval`, parsed estimates).
- Opens `<TicketDetailSheet>`.
- `refreshSelected()` re-runs `load()` and re-fetches the selected ticket so the sheet stays in sync after edits.

## Empty / loading
- 5 skeleton rows while loading.
- Empty state ("Nothing on your plate") when there are no open assignments.
