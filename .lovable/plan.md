## Goal

In **Project Health → Member capacity**, **add** a new column showing **Remaining hours** assigned to each member, alongside the existing "Open tix" count and "hours this week" column.

## What "remaining" means (per member)

For each ticket assignee row (user + slot FE/BE):
- Only count if the slot's discipline status is **not `done`** (slot is still active for that person)
- Remaining for that slot = `max(0, current_{fe|be}_estimate − actual_{frontend|backend}_hours)`
- Sum across all such rows per user → that member's total remaining workload

This is per-member because it walks each member's assigned slots individually.

## Changes

**`src/features/health/ProjectHealth.tsx`**

1. Add a `remainingByMember` memo computed from `tickets`:
   - Initialize each `members[].user_id` to `0`.
   - For each ticket, for each assignee:
     - If `slot === "FE"` and `fe_status !== "done"`: add `max(0, current_fe_estimate − actual_frontend_hours)`
     - If `slot === "BE"` and `be_status !== "done"`: add `max(0, current_be_estimate − actual_backend_hours)`

2. Update panel header subtitle from "Open tickets · hours this week" to **"Open tickets · remaining · hours this week"**.

3. In each member row, insert a new cell **between** the "tix" count and the weekly hours cell:
   ```tsx
   <div className="text-xs font-mono text-dim w-16 text-right">
     {formatHours(remainingByMember[m.user_id] ?? 0)}
     <span className="text-dimmer ml-1">left</span>
   </div>
   ```
   (Or a clean `w-16 text-right` mono cell matching the existing weekly-hours styling.)

4. Keep the weekly hours fetch and column unchanged.

## Notes

- Uses data already loaded by `useProjectTickets` — no new queries.
- Done slots are excluded so completed work doesn't inflate remaining capacity.
- Negative remaining (over budget) is clamped to 0 so the column reflects "work left", not overruns (overruns are already covered by the Profitability ring).
