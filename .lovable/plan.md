# Include 0-estimate tickets in sprint carryover

## Goal
Ensure user stories with a 0-hour estimate still appear in a developer's Carryover Review panel on the next sprint, as long as their FE/BE discipline status is not `done` (i.e. the ticket is not Dev Done or Done).

## Current state (verified)

- Carryover candidates come from `useCarryoverTickets` in `src/features/sprints/useSprintBoard.ts`. It:
  - Finds tickets the user had `sprint_tickets` rows for in *prior* sprints,
  - Excludes tickets already committed in the target sprint,
  - Keeps a ticket if any of the user's disciplines (`memberDisciplines(role)`) has `fe_status`/`be_status !== "done"`.
  - **Does not filter by estimate hours** — so on paper 0h tickets should already be included.
- `CarryoverReviewPanel` and `PlanningDevColumn` don't filter by hours either; `remaining(...)` is only used for display and capacity math.
- The likeliest culprit for the reported exclusion is upstream: prior sprint commitments may have been stored without a `discipline` value / with no `sprint_tickets` row for a 0h ticket, or the ticket's `fe_status`/`be_status` for the user's discipline is `done` even though it was never worked (recent change made these statuses NULL-by-default and set to `todo` only when a dev is assigned — a 0h ticket briefly assigned then unassigned in a prior sprint could look "done" via derivation).

So the diagnosis is **unconfirmed** — the fix must start by identifying which check actually drops these tickets in the affected project.

## Plan

1. **Investigate on real data** (read-only SQL) for one affected 0h ticket:
   - Fetch its `fe_status`, `be_status`, `current_fe_estimate`, `current_be_estimate`, `current_project_estimate`, `project_status_override`.
   - Fetch its `sprint_tickets` rows (sprint_id, assigned_user_id, discipline) and the sprints' numbers/dates.
   - Fetch its `ticket_assignees` rows.
   - Confirm which of these three conditions is dropping it from `useCarryoverTickets`:
     a. No prior `sprint_tickets` row for that user, or
     b. `discipline` on the prior row is NULL (so the user's role branch doesn't match), or
     c. Both `fe_status` and `be_status` (for the user's disciplines) are `"done"` even though the work isn't finished.

2. **Fix based on the finding** — do not change unrelated behavior:
   - If (a): out of scope for this ticket (there was never a commitment to carry — clarify with the user).
   - If (b): in `useCarryoverTickets`, when `sprint_tickets.discipline` is NULL, fall back to matching by the user's `memberDisciplines(role)` so legacy rows still surface. Keep the `discipline !== "done"` check.
   - If (c): treat NULL discipline status as "not done" (already the case), and additionally include a discipline in the carryover check when the user's `ticket_assignees` slot is present for it — so a 0h ticket that was manually flipped to `done` on one side but the user was assigned on the other still surfaces on the correct side. Concretely: change the `nonDone` predicate to `discs.some(d => (d === "FE" ? t.fe_status : t.be_status) !== "done")` unchanged, but broaden `discs` to include any discipline where the user has a `sprint_tickets` row in a prior sprint for this ticket, not just `memberDisciplines(role)`.

3. **Verify** by re-running the same SQL scenario and by opening the next-sprint Planning tab for the affected dev in the preview to confirm the 0h ticket now appears in the Carryover Review banner.

## Explicitly out of scope
- No changes to pool filtering, capacity math, timers, or estimate logging.
- No schema changes.
- No change to what "Dev Done" means or how project status is derived.

## Technical notes
- Only `src/features/sprints/useSprintBoard.ts` (function `useCarryoverTickets`) is expected to change. `CarryoverReviewPanel.tsx` will render whatever list it receives; the `remaining(...)` display for a 0h ticket will show `0h`, which is correct.
- If the investigation reveals a different root cause (e.g. a hidden filter elsewhere), I'll come back with a revised plan before editing.

## Clarifying question
If it helps you, could you share one specific ticket ID (e.g. `DRA-###`) and the sprint you expected it to carry over into? That lets step 1 confirm the exact cause on real data before any code change.
