# Remove Overhead, replace with Project Contributors

Every ticket — Standard, Bug, CR, and Proj — gets a shared **Project** bucket. QA / PMBA / Design members are assigned via a new **Project Contributors** slot and always log to that Project bucket. Overhead is removed everywhere: UI, code, enum, and column.

## Behaviour after the change

- **FE / BE assignees**: log to FE or BE (unchanged).
- **Project Contributors** (QA, PMBA, Design, or any non-FE/BE member): log to the ticket's Project bucket. Works on any ticket type.
- **Proj tickets**: same as today — only have a Project slot, all assignees log to Project.
- **Non-Proj tickets**: now expose three slots — FE, BE, Project Contributors — instead of FE, BE, Other.

## Changes

### Database (one migration)
- Drop `tickets.actual_overhead_hours` column.
- Migrate existing `ticket_assignees.slot = 'Other'` rows → `slot = 'Project'`.
- Add `'Project'` to `assignee_slot` enum if not already present (it is — keep as-is). Remove `'Other'` from the enum (recreate enum without it; rewrite the column with the new enum).
- Remove `'Overhead'` from `log_discipline` enum (recreate enum without it). Safe — 0 Overhead logs exist.
- Update `apply_time_log()` trigger function to drop the Overhead branch.
- Update `validate_ticket_assignee()` to drop the Other slot reference.
- For non-Proj tickets that have a `current_project_estimate` of 0 but receive Project-slot assignees, behaviour is fine — estimate stays 0, actuals accumulate. PMBAs can edit `current_project_estimate` later if needed (existing field).

### Frontend code

**`AssignDialog.tsx`**
- Always show three slots on non-Proj tickets: Frontend, Backend, **Project Contributors**.
- Eligibility for Project Contributors: any project member (so QA/PMBA/Design land here naturally).
- Drop the "Other" slot entirely.

**`BulkAssignDialog.tsx`**
- Replace the "Other contributors" picker with **Project Contributors**, writing `slot = 'Project'` for non-Proj tickets too.
- Remove all Overhead/Other logic.

**`LogTimeModal.tsx`**
- Drop `isOverhead` branch.
- New rule: if user is on the ticket via `slot = 'Project'` (only) → discipline = Project. If user is FE/BE → that discipline. Fullstack with both → toggle FE/BE.
- Discipline picker shows Project alongside FE/BE for Fullstack users assigned to a Project slot.

**`StartGroupTimerDialog.tsx`**
- Replace `isOverhead` with `hasProjectAssignments` (assigned via Project slot on any ticket).
- Discipline options: FE/BE based on role; Project shown if user has any Project-slot assignments.
- Filter `myTickets` for Project discipline: tickets (any type) where user has `slot = 'Project'`.

**`StopGroupTimerDialog.tsx`**
- Remove the `isOverhead` constant and its UI branch. Project tickets keep their existing "no per-ticket status" behaviour.
- Discipline label drops the Overhead fallback.

**`ProjectHealth.tsx`**
- Remove the **Overhead** stat card.
- Update `ticketsByMember` and `remainingByMember`: treat `slot = 'Project'` like FE/BE (count toward capacity if ticket isn't done; remaining = `current_project_estimate - actual_project_hours`).

**`TicketDetailSheet.tsx`**
- Drop the "Overhead logged" line.
- Replace the "Other" assignees block with a **Project Contributors** block (same data, slot = Project).
- Show Project actuals/estimate on non-Proj tickets when there are Project-slot assignees.

**`TicketCard.tsx`**
- Replace the `slot === 'Other'` filter with `slot === 'Project'` for the contributors row.

**`MyWork.tsx`**
- Drop `'Other'` from the slot type. Project-slot rows show project actuals/estimate.

**`useProjectTickets.ts`** + **`types.ts`** consumers
- Drop `actual_overhead_hours` field from `TicketRow` interface and any references.
- Slot type narrows from `"FE" | "BE" | "Other" | "Project"` to `"FE" | "BE" | "Project"`.

**`EstimateEvolution.tsx`**
- Narrow `discipline` type from `"FE" | "BE" | "Overhead"` to `"FE" | "BE"` (already ignoring overhead in the chart).

### Copy / labels
- "Other contributors" → "Project contributors"
- ProjectTeam.tsx blurb: drop the "Other" wording, mention Project contributors instead.
- AssignDialog description for Project Contributors: "QA, PMBA, Design — anyone else on the ticket. Time logged here goes to the ticket's Project bucket."

## Order of operations

1. **Migration first** (drops column + enum values, migrates Other → Project rows, updates trigger function). User approves and runs it.
2. **Code update** in one pass — types tighten as soon as `supabase/types.ts` regenerates, so all the dropped enum/column references will surface as compile errors and get fixed together.
