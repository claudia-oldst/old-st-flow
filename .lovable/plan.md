## Fix

New/unassigned tickets currently derive to "TO DO" instead of "BACKLOG" because the seed derivation rule for `FE=todo AND BE=todo` still points at the old "TO DO" status row. That rule was seeded before the "BACKLOG" status existed (added later at position 1), so its `status_id` was never updated.

### Migration
- In `public.status_derivation_rules`, update any rule whose `status_id` matches the "TO DO" status row to point at `public.first_status_in_category('backlog')` — which now resolves to BACKLOG (position 1). Scoped by matching the "TO DO" id specifically so PMBA-authored rules aren't touched.
- Call `SELECT public.reapply_status_rules();` so existing non-overridden tickets currently on "TO DO" (both FE/BE = todo) re-derive to BACKLOG.

### No code changes
- `AddTicketsDialog`, `derive_project_status`, and the statuses table itself are unchanged.
- Tickets with `project_status_override = true` keep their manual status (guaranteed by `reapply_status_rules`).

### Verification
- Create a fresh, unassigned ticket → project status = BACKLOG.
- Existing unassigned/non-overridden tickets that showed "TO DO" now show BACKLOG.
- Manually-overridden tickets unchanged.
- Status Rules admin: the backlog-bucket rule's "THEN Project =" now reads BACKLOG.
