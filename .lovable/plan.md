# Pick a sprint when assigning people to a ticket

Assigning a developer to a ticket should also commit that ticket to a sprint for them, so the planning board and the Gantt chart stay accurate instead of relying on someone dragging tickets in later.

## What changes

**Assign people dialog (single ticket)**
- A new "Sprint" row of pills at the top of the dialog: one pill per sprint, plus a "No sprint" pill. Hovering a sprint pill shows its date range.
- Defaults to the sprint covering today's date. If no sprint covers today, the next upcoming one is pre-selected.
- The people lists stay hidden until a sprint (or "No sprint") is picked, so the choice is always deliberate.
- If the project has no sprints at all, the row shows a "Create a sprint" button that opens the project's Sprints tab, alongside the "No sprint" pill.
- On save, every newly added Frontend/Backend person gets the ticket committed to their column in the chosen sprint (same result as dragging the ticket onto them in sprint planning). Picking "No sprint" assigns people without any sprint commitment.
- People removed from the ticket have their commitment for the selected sprint removed too.

**Bulk assign dialog (multiple tickets)**
- Same sprint pills, same default, same hide-until-chosen behaviour — applied to every selected ticket.

**Scope rules**
- Project-type tickets and "Project contributors" are never committed to a sprint (sprints track Frontend/Backend work only); the sprint choice simply has no effect for them.
- Existing commitments are left alone; nothing is duplicated if a person is already committed to that ticket in that sprint.


## Technical notes

- Reuse `addTicketToLane(sprintId, ticketId, userId, slot)` from `src/features/sprints/dnd.ts` — it already inserts the `sprint_tickets` row with the right discipline and is idempotent.
- Removal path: delete the matching `sprint_tickets` row for (selected sprint, ticket, user, discipline). Reuse the `cleanupAssignee` guard in `dnd.ts` so rows with existing `time_logs` keep their assignee record.
- Sprint list comes from the existing sprints query for the project (`useSprintBoard` helpers); default selection picks the sprint where `start_date <= today <= end_date`, else the earliest sprint with `start_date > today`.
- Wiring points: `src/features/tickets/AssignDialog.tsx` (add picker + gate `handleSave`/`performSave`) and `src/features/tickets/bulk-assign/useBulkAssign.ts` + `BulkAssignDialog.tsx`.
- No schema, RLS, or trigger changes — `sprint_tickets` already has `discipline` and per-dev rows.
