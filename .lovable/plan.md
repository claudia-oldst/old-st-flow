## What's happening

The duplicate-key error comes from `sprint_tickets_sprint_id_ticket_id_key` — a `UNIQUE (sprint_id, ticket_id)` constraint that forces one ticket per dev per sprint. You want a ticket to be assignable to multiple devs in the same sprint (e.g. one FE + one BE).

## Fix

### 1. Schema migration — drop the unique constraint, add a new one

In `supabase/migrations/`, new migration:

```sql
ALTER TABLE public.sprint_tickets
  DROP CONSTRAINT IF EXISTS sprint_tickets_sprint_id_ticket_id_key;

-- Prevent the same dev being added twice to the same (sprint, ticket).
-- assigned_user_id is nullable, so use a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS sprint_tickets_sprint_ticket_user_uniq
  ON public.sprint_tickets (sprint_id, ticket_id, assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;
```

This keeps the data clean (no exact duplicates) while allowing multiple devs per ticket per sprint.

### 2. Code — no logic change needed in `addTicketToLane`

The existing check already filters by `(sprint_id, ticket_id, assigned_user_id)` and short-circuits when that exact row exists, so it's already correct under the new constraint. No edits to `dnd.ts`.

### 3. Quick audit for assumptions that "one row per (sprint, ticket)"

Grep `sprint_tickets` consumers (`useSprintBoard.ts`, `SprintWorkbench.tsx`, `PlanningPoolPanel.tsx`, `useGanttData.ts`, `usePoolData.ts`, `CarryoverReviewPanel.tsx`) and confirm none of them assume a single row per (sprint, ticket):

- `SprintWorkbench` groups by `assigned_user_id` already — fine.
- `removeTicketFromSprint` deletes by `sprint_tickets.id` — fine.
- The carry-over loop uses `sprintTickets.find((st) => st.ticket_id === id)` to pick the current dev — this still finds the first one, which is acceptable. I'll flag if I find a place that *requires* uniqueness; only change what's actually broken.

This is exploration-only — I'll report any real issues before patching them, to keep the change minimal.

## Verify

- Migration applies cleanly.
- Retry COUT-012 → Lind in the sprint that already has Gino. Both rows exist; toast says "Assigned 1 ticket"; the workbench shows the ticket in both Gino's and Lind's lanes.
- Re-assigning the same dev a second time is a no-op (early return) and no longer hits the unique error.

## Out of scope

- UI affordance to manage multiple devs per ticket beyond what already exists.
- Backfill / dedup of historical rows — there are none to clean up (the old constraint prevented them).
