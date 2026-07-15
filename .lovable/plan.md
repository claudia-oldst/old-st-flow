# Per-discipline sprint assignments (revised backfill)

## The problem
`sprint_tickets` has no FE/BE dimension. The planning pool hides any ticket that appears in any dev column, so a fullstack dev's FE commit incorrectly hides the ticket from the BE pool when the FE/BE toggle is switched.

## Fix

### 1. Schema (migration)
- Add `discipline` (`'FE' | 'BE'`, NOT NULL, CHECK constraint) to `public.sprint_tickets`.
- Backfill using `ticket_assignees.slot` as the source of truth for which discipline each existing commit represents:
  - If the same `(ticket_id, assigned_user_id)` has an `FE` slot in `ticket_assignees` → discipline `'FE'`.
  - If it has a `BE` slot → discipline `'BE'`.
  - If it has **both** slots → keep the existing row as FE and insert a duplicate row for BE (this dev really was committed to both).
  - If it has neither → fall back to the user's project role: Frontend → FE, Backend → BE, everything else (Fullstack without any assignee slot, QA/PMBA/Design, unassigned) → FE.
  - Fullstack devs are NOT given an automatic FE+BE pair — they only get a row for the discipline they were actually working.
- Replace the existing partial unique index `(sprint_id, ticket_id, assigned_user_id)` with `(sprint_id, ticket_id, assigned_user_id, discipline)`.
- Regenerate Supabase types.

### 2. Writes
- `addTicketToLane(sprintId, ticketId, userId, slot)` — insert with `discipline: slot` and include it in the "already committed" check.
- `useWorkbenchBulkActions` (assign / move / carry / remove) — already knows the current discipline; thread it into inserts and scope row lookups when removing so only the current discipline's row is deleted.
- `CarryoverReviewPanel` — already passes `slot`; no change needed.
- `removeTicketFromSprint` unchanged (deletes by row id).

### 3. Reads
In `useWorkbenchData` (Planning tab): filter `sprintTickets` to `discipline === current discipline` before building `devAssignments`, `allDevTicketIds`, and `pooledHours`.

The FE/BE toggle then behaves as described: it filters both the pool AND the visible devs/columns by discipline. A fullstack dev's FE-only commitment shows up in FE view; on BE view, the same ticket returns to the BE pool until it's explicitly committed for BE too.

### 4. Verification
- Assign a fullstack dev an FE ticket → toggle to BE → the ticket reappears in the pool and is absent from that dev's BE column. Commit it for BE → hides from the BE pool.
- Capacity bars still reflect per-discipline committed hours (they read the discipline-filtered `devAssignments`).

## Out of scope
- No UI changes to the toggle or planning layout.
- No changes to `ticket_assignees`, time logs, or roadmap FE/BE planned-sprint columns (already independent).
- No change to carryover eligibility logic.
