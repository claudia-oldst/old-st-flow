# Gantt: carried-over tickets don't count in bar colours

## What changes
- A sprint bar's colours only use tickets that **stayed** in that sprint (finished there or are still there). Carried-over tickets no longer add a grey slice.
  - Example: Application Forms in S18 had 8 tickets, 4 carried to S19, 4 done → the bar is fully green.
- If every ticket in a sprint was carried over, the bar stays grey and faded (as now).
- The tooltip keeps "Carried: S19 (4)".
- The tooltip title shows the count next to the epic name: **Application Forms (4/8)** = 4 of 8 tickets were not carried over. Only shown when something was carried.
- The client portal timeline gets the same rule.

## Technical details
- `src/features/sprints/gantt/GanttBar.tsx`: remove the `past` slice unless `past === total`; append `(total - past)/total` to the title when `past > 0`.
- `src/features/client-portal/PortalTimeline.tsx`: same change.
- No database changes, no notifications.
