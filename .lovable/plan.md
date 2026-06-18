## Goal

Make the Gantt bar tooltip reflect the actual committed/planned mix of tickets in **that specific segment**, instead of the epic-wide flag. Show a "mixed" label with counts when a segment contains both.

## Changes

### 1. `src/features/sprints/gantt/useGanttData.ts`

Track committed vs planned counts per segment (and keep the epic-level `isCommitted` only for row-level styling like opacity, which is still useful as a row hint).

- Extend `GanttSegment` with `committed: number` and `planned: number`.
- In the aggregation loop, when a ticket resolves, increment the new counter on the per-sprint segment based on `res.committed`.
- Populate the new fields when pushing segments at the end.

### 2. `src/features/sprints/gantt/GanttBar.tsx`

- Drop reliance on `isCommitted` for the tooltip label (keep it only for the row opacity styling — or we can derive that per-segment too; see "Open detail" below).
- Compute label from segment counts:
  - `committed > 0 && planned === 0` → `committed`
  - `committed === 0 && planned > 0` → `planned only`
  - both > 0 → `mixed — {committed} committed, {planned} planned`
- Render that label in the existing uppercase footer line of the tooltip.

### 3. Optional polish (same files)

Make the bar opacity per-segment too, so a fully-planned segment in a partly-committed epic looks dimmed even when the epic has other committed segments. Specifically: use `segment.committed > 0` instead of the row-level `isCommitted` for the `opacity-60` class. The row-level flag stays available for any future row-header styling but isn't used on bars.

## Out of scope

No DB / RPC / schema changes. No visual redesign of the bars themselves — only the tooltip text and (optionally) per-segment opacity.
