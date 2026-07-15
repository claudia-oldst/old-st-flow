# Per-discipline sprint assignments

## The problem
`sprint_tickets` today records "this dev is committed to this ticket in this sprint" with no FE/BE dimension. In planning, the pool hides every ticket that appears in any dev column. So when a fullstack dev is committed to a ticket on the **FE** view, switching the discipline toggle to **BE** still treats the ticket as already-assigned and hides it from the BE pool — even though the BE side of the ticket hasn't been planned yet.

## Fix
Give sprint commitments an explicit discipline, then filter the planning views by it.

### 1. Schema (migration)
- Add column `discipline` (`'FE' | 'BE'`, NOT NULL) to `public.sprint_tickets`.
- Backfill existing rows using the assigned user's project role:
  - `Frontend` → one row with `discipline = 'FE'`
  - `Backend` → one row with `discipline = 'BE'`
  - `Fullstack` → duplicate the row so the dev has both an FE and a BE commitment (matches today's behaviour, where their single row counted for both views)
  - Any other role (QA/PMBA/Design, unassigned) → default to `'FE'` (edge cases; these don't drive planning)
- Replace the existing uniqueness (sprint_id, ticket_id, assigned_user_id) with `(sprint_id, ticket_id, assigned_user_id, discipline)`.
- Regenerate Supabase types.

### 2. Writes
- `addTicketToLane(sprintId, ticketId, userId, slot)` already receives the slot — write `discipline: slot` into the insert and match on it in the "already committed" check.
- `removeTicketFromSprint` unchanged (deletes by row id).
- `useWorkbenchBulkActions` (assign / unassign / move) already knows the current discipline — thread it into every `sprint_tickets` insert and use it when locating the row to remove.
- `CarryoverReviewPanel` "Bring forward" copies the previous row — copy its `discipline` too.

### 3. Reads
In `useWorkbenchData` (workbench Planning tab):
- Filter `sprintTickets` down to rows where `discipline === current discipline` before building `devAssignments`, `allDevTicketIds`, and `pooledHours`.

Result: a fullstack dev's FE commitment now only shows in the FE view and only excludes the ticket from the FE pool. On the BE toggle, the same ticket reappears in the BE pool until it's explicitly committed for BE too.

`usePlannedSprintAssignments` (roadmap planning, FE/BE sprint columns) already tracks FE/BE independently via `planned_sprint_fe_id` / `planned_sprint_be_id` and is not affected.

### 4. Verification
- Manual: assign a fullstack dev an FE ticket → toggle to BE → confirm the ticket is back in the pool and absent from the dev's BE column, then commit it for BE → confirm it now hides from the BE pool too.
- Check the sprint capacity bars still reflect per-discipline committed hours correctly (they read `devAssignments`, which is now discipline-filtered).

## Out of scope
- No UI redesign of the planning surface — same drag/drop, same toggle.
- No changes to `ticket_assignees`, time logs, or the roadmap Planning columns.
