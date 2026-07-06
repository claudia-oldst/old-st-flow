# Allow zero-hour tickets in the Sprint Planning pool

Currently the pool in `PlanningPoolPanel.tsx` filters out any ticket whose remaining hours for the selected discipline are 0 (via the `hasHours` check). This blocks assigning tickets that legitimately have no FE/BE estimate yet but still need to be planned.

## Change

**`src/features/sprints/PlanningPoolPanel.tsx`** — In the `pool` `useMemo`, remove the `hasHours` guard so tickets with 0 remaining hours in the selected discipline still appear in the pool and can be selected/assigned.

`PoolRow` already handles 0 gracefully (`formatHours(0)`), and downstream capacity math treats missing hours as 0, so no other changes are needed.

## Out of scope

- No changes to dev columns, capacity calculations, or DB.
- No new UI affordance to distinguish zero-hour tickets (can add later if wanted).
