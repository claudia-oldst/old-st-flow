# Drag and drop in sprint planning

Today, moving tickets in the Planning view only works through tick-boxes and the bulk action bar. The pool rows and developer column rows are plain rows with no drag behaviour (the docs describe dragging, but it was never built).

## What you will be able to do

- Drag a ticket from the pool onto a developer column to commit it to that developer for the selected sprint and discipline.
- Drag a ticket from one developer column to another to hand the work over.
- Drag a ticket from a developer column back to the pool to uncommit it from the sprint.
- Drag a multi-selection: if you tick several tickets and drag any one of them, the whole selection moves together. A small badge on the drag preview shows how many tickets are moving.
- Visual feedback while dragging: the target column highlights, the dragged row dims, and the column header shows the capacity it would reach.
- Everything saves immediately, with a toast confirming how many tickets moved, and an error toast if something is rejected.
- A **Select all** checkbox in each developer column header, mirroring the pool's "Select all". It toggles only that dev's currently visible tickets in this sprint+discipline, supports the same indeterminate state, and feeds the existing `SprintSelectionContext` so the bulk bar and drag-multi work the same way as the pool.

Project-type tickets and the Project slot stay out of this — only FE/BE commitments are affected, matching the current rules. Non-PMBA users keep read-only rows (no dragging).

## Technical notes

- Use `@dnd-kit/core` (already a dependency) with a `DndContext` mounted in `SprintWorkbench` wrapping both the pool panel and the dev columns, `PointerSensor` with an 8px activation distance so clicks and checkbox taps still work.
- Draggables: `PoolRow` (`id: ticketId`, data `{ source: "pool" }`) and the dev column row in `PlanningDevColumn` (data `{ source: "dev", userId }`). Droppables: the pool list container (`id: "pool"`) and each dev column body (`id: dev:<userId>`).
- Drag payload resolution: if the dragged ticket id is in the current selection (`SprintSelectionContext`), move the whole selection; otherwise move just that ticket.
- Reuse existing operations rather than new SQL:
  - pool to dev / dev to dev target: `addTicketToLane(sprintId, ticketId, userId, discipline)`
  - dev to pool / dev to dev source: `removeTicketFromSprint(linkId, ticketId, userId, discipline)` looked up from `sprintTickets` for the active discipline.
- Put the drop handling in a new `src/features/sprints/workbench/useWorkbenchDnd.ts` that takes the same params as `useWorkbenchBulkActions` (sprint, discipline, sprintTickets, isPMBA, clear, invalidate) and returns `onDragStart` / `onDragEnd` plus `activeId`. Keep `useWorkbenchBulkActions` unchanged so the bulk bar keeps working.
- `DragOverlay` renders a compact row (formatted id, title, and a `+N` badge for multi-drag).
- Update `docs/pages/sprints-planning.md` only where it now matches reality.
