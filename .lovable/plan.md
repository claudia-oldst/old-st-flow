## Problem

On the Project Pulse Sprint Gantt (BE tab), the "Ticket Management & Board Views" bar for Sprint 1 (Jul 6 → Jul 17) shows `todo: 2 · in progress: 0 · for integration: 0 · done: 2` — only 4 tickets.

The actual sprint commitment for that epic is **25 tickets** (3 todo + 22 done), all committed to a Backend member. I confirmed this against the database.

## Root cause

`src/features/sprints/gantt/useGanttData.ts` skips every ticket whose current discipline estimate is 0:

```ts
const hasHours =
  discipline === "FE"
    ? (t.current_fe_estimate || 0) > 0
    : (t.current_be_estimate || 0) > 0;
if (!hasHours) continue;
```

23 of the 25 committed BE tickets in that epic have `current_be_estimate = 0` (estimates were cleared or never entered, even though the tickets are committed and done by a BE dev). The gantt silently drops them, so the tooltip shows 2/2 instead of 3/22.

No other gantt view (Roadmap board, workbench) applies this filter — they use commitment/planned assignment as the source of truth.

## Fix

Remove the `hasHours` gate from `useGanttData`. Discipline membership is already established downstream by the two existing rules:

1. **Committed:** ticket has a `sprint_tickets` row whose assignee's project role maps to the current discipline (`memberDisciplines(role)`).
2. **Planned:** ticket's `planned_sprint_fe_id` / `planned_sprint_be_id` points at a sprint.

A ticket that is neither committed to a BE dev nor planned on the BE side still gets filtered out by the existing resolution step (`if (!res) continue;`), so removing `hasHours` cannot pull FE-only tickets into the BE view.

### File changes

- **`src/features/sprints/gantt/useGanttData.ts`** — delete the `hasHours` block (the 4 lines that compute `hasHours` and the `if (!hasHours) continue;`). Nothing else in the file needs to move.

### Not changing

- `SprintGantt.tsx`, `GanttGrid.tsx`, `GanttBar.tsx`, legend, discipline switcher — unchanged.
- Estimate-driven views (capacity bars, hours totals) — unchanged; they legitimately need `current_*_estimate`.
- Merge logic for the ALL tab — unchanged; already tolerant of zero-estimate tickets once they flow through.

## Verification

1. Reload Project Pulse → Sprints → Gantt → **BE** tab. Hover "Ticket Management & Board Views" in Sprint 1. Tooltip should now read `todo: 3 · in progress: 0 · for integration: 0 · done: 22`.
2. Switch to **FE** tab — epic bar should still reflect only FE commitments/plans (unchanged behaviour for epics that were correct before).
3. Switch to **ALL** — combined counts should equal FE + BE per sprint.
4. Spot-check one other epic (e.g. "Sprint Planning & Roadmap") to confirm no over-counting.
