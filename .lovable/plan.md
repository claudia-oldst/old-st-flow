# Gantt: only a ticket's latest sprint shows its status

## What changes
- For each ticket (per FE / BE), only the **latest sprint** it is planned or committed in shows its real status colour (todo / in progress / for integration / done).
- Earlier sprints the ticket passed through still count it, but as a **plain grey "moved on"** slice with no status colour.
- Example: ticket in S2, S3, S4 -> S2 and S3 show a grey slice for it; S4 shows it as in progress.
- A sprint bar whose tickets have all moved on becomes fully grey and faded, so old sprints read as history and the current picture stands out.
- Tooltip on an earlier sprint lists where its tickets went, e.g. "Carried: S4" (one entry per later sprint, with counts if several tickets went to different sprints).
- In ALL mode, FE and BE are judged separately (a ticket's FE may be latest in S4 while its BE is latest in S3).
- The client portal timeline uses the same builder, so it follows the same rule.

## Technical details
- `gantt/buildGanttRows.ts`: per ticket, collect its sprint entries for the discipline, find the one with the latest sprint start date; add its status there, and add `past += 1` to every earlier entry and record the latest sprint name in a `carriedTo` map (sprint name -> count). Add `past` and `carriedTo` to `GanttSegment`; include it in `total`.
- `gantt/GanttBar.tsx`: render a neutral grey slice (`bg-muted` token) for `past`; when `past === total`, fade the whole bar. Tooltip shows "Carried: S4" from `carriedTo` (sprint names passed in from the sprints list).
- Update `buildGanttRows.test.ts` with the S2/S3/S4 case (S2, S3 = past only; S4 = in_progress).
- No database changes, no notifications.
