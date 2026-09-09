# Pick a sprint when assigning people to a ticket

Assigning a developer to a ticket should also commit that ticket to a sprint for them, so the planning board and the Gantt chart stay accurate instead of relying on someone dragging tickets in later.

## What changes

**Assign people dialog (single ticket)**
- A new "Sprint" selector at the top of the dialog, listing the project's sprints.
- Defaults to the sprint covering today's date. If no sprint covers today, the next upcoming one is pre-selected; if there are none, the picker shows "No sprints yet".
- Choosing a sprint is required: Save is disabled with a short hint whenever a Frontend or Backend person is selected and no sprint is chosen.
- On save, every newly added Frontend/Backend person gets the ticket committed to their column in that sprint (same result as dragging the ticket onto them in sprint planning).
- People removed from the ticket have their commitment for that sprint removed too.

**Bulk assign dialog (multiple tickets)**
- Same sprint selector, same default, same requirement — applied to every selected ticket.

**Scope rules**
- Project-type tickets and "Project contributors" are never committed to a sprint (sprints track Frontend/Backend work only), so the sprint requirement does not apply when only those are being assigned.
- Existing commitments are left alone; nothing is duplicated if a person is already committed to that ticket in that sprint.
- If a project has no sprints, assignment still works exactly as it does today.

## Technical notes

- Reuse `addTicketToLane(sprintId, ticketId, userId, slot)` from `src/features/sprints/dnd.ts` — it already inserts the `sprint_tickets` row with the right discipline and is idempotent.
- Reuse `removeTicketFromSprint` logic for un-assignment: delete the matching `sprint_tickets` row for (sprint, ticket, user, discipline). Assignee cleanup already happens in the dialogs' own diff.
- Sprint list comes from the existing sprints query for the project (`useSprintBoard` helpers); default selection picks the sprint where `start_date <= today <= end_date`, else the earliest sprint with `start_date > today`.
- Wiring points: `src/features/tickets/AssignDialog.tsx` (add picker + gate `handleSave`/`performSave`) and `src/features/tickets/bulk-assign/useBulkAssign.ts` + `BulkAssignDialog.tsx`.
- No schema, RLS, or trigger changes — `sprint_tickets` already has `discipline` and per-dev rows.
