## Goal

A ticket only has an FE dev status when at least one Frontend assignee exists, and only has a BE dev status when at least one Backend assignee exists. Unassigned slots show no chip, no kanban card, no group bucket, and cannot be filtered or edited until someone is assigned. Newly assigned slots start at **To-do**.

## Approach

Derive `hasFE` / `hasBE` from `ticket.assignees` everywhere in the UI. No schema change needed — the DB still stores `fe_status` / `be_status` (default `todo`). When the last assignee for a slot is removed, we reset that slot back to `todo` so it can't silently influence the auto-derived project status.

## Changes

### 1. Helper (lightweight, inline)
Add `hasSlot(ticket, "FE" | "BE")` logic inline where needed (one-liner: `ticket.assignees.some(a => a.slot === slot)`).

### 2. `TicketCard.tsx` (kanban card)
- Already gates on `fe.length > 0` etc. for the Bar — extend the chip render with the same condition so the chip is only shown when that slot has at least one assignee. Today it relies on estimate/actuals, which can show a chip with no assignee.

### 3. `TicketsList.tsx`
- `dev_status` cell: only render `<DisciplineStatusChip slot="FE" />` if FE assignee exists, same for BE. If neither, render `—`.
- Group-by `fe_status`: skip tickets that have no FE assignee. Same for `be_status`.

### 4. `ProjectBoard.tsx` (discipline mode)
- In the "All" branch, only push an FE card if the ticket has an FE assignee, and only push a BE card if it has a BE assignee.
- The "My tickets" branch already filters by user assignment, so it's correct.

### 5. `TicketDetailSheet.tsx`
- The Discipline panel renders `DisciplineRow` for FE and BE unconditionally. Change to:
  - If no FE assignee: show a muted row "Frontend — no assignee" with an "Assign" link that opens `AssignDialog`. No status select.
  - Same for BE.
- "Request more time" buttons already key off `canEditFE/BE`, which require assignment — no change needed there.

### 6. `TicketsFilter.tsx` + `applyFilters`
- When filtering by `feStatuses`, also require the ticket to have an FE assignee (otherwise the status is not meaningful). Same for `beStatuses`.

### 7. `AssignDialog.tsx` and `BulkAssignDialog.tsx` (auto-reset on un-assign)
- Compute which slots lost their last assignee in this save (was-assigned, now-empty) and patch `tickets.fe_status = 'todo'` / `be_status = 'todo'` for those tickets/slots after the assignee mutation. This guarantees the auto project-status derivation behaves correctly when a slot becomes unassigned.

### 8. Drag-and-drop guard (discipline kanban)
- In `handleDragEnd` for discipline mode, ignore drops onto a discipline column for a slot the ticket no longer has assignees in (defensive — UI already wouldn't render those cards, but realtime updates could race).

## What stays the same

- DB schema, RLS, and the `derive_project_status` trigger are unchanged.
- CSV import keeps writing `fe_status` / `be_status` as today; if no one is later assigned for that slot, the chip is simply hidden in the UI. (Optional follow-up: on import, force `todo` if no assignment is being created — happy to add if you want.)
- Time logging is unaffected.

## Files Edited

- `src/features/tickets/TicketCard.tsx`
- `src/features/tickets/TicketsList.tsx`
- `src/features/board/ProjectBoard.tsx`
- `src/features/tickets/TicketDetailSheet.tsx`
- `src/features/tickets/TicketsFilter.tsx`
- `src/features/tickets/AssignDialog.tsx`
- `src/features/tickets/BulkAssignDialog.tsx`
