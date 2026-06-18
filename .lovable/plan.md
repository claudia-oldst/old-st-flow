# Gantt Chart Tab (Segmented per-sprint bars)

A new read-only third tab on the Sprints page. Each epic is a row in a week-scaled lane, rendered as **one bar segment per sprint that has tickets** — sprints with no work for that epic become genuine empty gaps. FE/BE toggle and PNG export.

## Cleanup first

- Delete `src/features/sprints/hours.ts`.
- Replace every `import { formatHours } from ".../hours"` inside `src/features/sprints/` with `import { formatHours } from "@/lib/utils"` (affects any of: `CapacityIndicator.tsx`, `CarryoverReviewPanel.tsx`, `PlanningDevColumn.tsx`, `PlanningPoolPanel.tsx`, `SprintWorkbench.tsx`).

## Files

**Modified**
- `src/features/sprints/SprintsPage.tsx` — add a third `TabsTrigger value="gantt"` labelled "Gantt" and a `TabsContent` rendering `<SprintGantt projectId={projectId} sprints={sprints} />`.

**New**
- `src/features/sprints/SprintGantt.tsx` — shell: FE/BE toggle, legend, Export PNG, empty state, footer note.
- `src/features/sprints/gantt/useGanttData.ts` — derives `GanttEpicRow[]` (with per-sprint `segments[]`) from existing query caches.
- `src/features/sprints/gantt/GanttGrid.tsx` — left epic column + right week-scaled lane with sprint dividers and today line; renders one `<GanttBar>` per segment.
- `src/features/sprints/gantt/GanttBar.tsx` — single segmented status fill bar with tooltip.

**Untouched**: `src/features/tickets/*`, `dnd.ts`, `ForecastingCalendar`, `SprintPoolingTable`, `SprintWorkbench`, `useSprintBoard.ts`, `types.ts`.

## Data (`useGanttData.ts`)

Inputs: `projectId`, `sprints`, `discipline`. No new Supabase queries — uses `useProjectTickets`, `useProjectSprintTickets`, `usePlannedSprintAssignments`, `useProjectMembers`, `useProjectEpics`.

Output types:

```ts
interface GanttSegment {
  sprintId: string;
  startDate: Date;
  endDate: Date;
  todo: number;
  in_progress: number;
  for_integration: number;
  done: number;
  total: number;
}

interface GanttEpicRow {
  epicId: number | null;
  epicName: string;
  segments: GanttSegment[];
  isCommitted: boolean;
  startDate: Date; // min across segments — sort only
  endDate: Date;   // max across segments — sort only
}
```

For each ticket:
1. Skip unless `current_fe_estimate > 0` (FE) or `current_be_estimate > 0` (BE).
2. Effective sprint = first `sprint_tickets` row whose `assigned_user_id` member has the selected discipline via `memberDisciplines(role)` — mark that ticket committed.
3. Else fall back to `planned_sprint_fe_id` / `planned_sprint_be_id`.
4. Else skip.

Group tickets by `epic_id` (null → "No epic"), then within each epic group by `sprintId` → one `GanttSegment` per unique sprint. Status counts (`fe_status` or `be_status`) and `total` are scoped to the segment's tickets only — no bridging across sprints. **Drop any segment where `total === 0`** (defensive: shouldn't happen given the ticket-level filtering, but guarantees no invisible/empty bars).

Segment `startDate`/`endDate` from the matching sprint's `start_date`/`end_date` (parse with `parseISO`). Row-level `isCommitted` = any ticket across any segment committed. Row-level `startDate`/`endDate` = min/max across segments. Drop epics with zero segments. Sort rows by `startDate` asc, then `epicName`.

## `SprintGantt.tsx`

State `discipline: "FE" | "BE"` default `"FE"`. Top bar: FE/BE segmented toggle (same pattern as Planning), inline legend with swatches (`bg-white/10`, `bg-amber-400`, `bg-indigo-400`, `bg-emerald-500`), `Export PNG` button with `Download` from lucide-react.

Install `html-to-image` if missing. Export handler calls `toPng(ganttRef.current, { backgroundColor: '#0f1117' })` and triggers `gantt-{FE|BE}-{yyyy-MM-dd}.png`.

Empty state when `rows.length === 0`. Footer note below grid: "Bars use committed sprint assignments where available, falling back to roadmap plan".

## `GanttGrid.tsx`

Range = min `start_date` / max `end_date` across `sprints`. Weeks via `eachWeekOfInterval(..., { weekStartsOn: 1 })`. Header has a fixed `w-48` epic-column label and a `flex-1 relative` week strip with `MMM d` labels and sprint boundary dividers (`border-l border-white/10` + `S{n}` label).

Wraps all rows in `<TooltipProvider delayDuration={150}>`. Each row: status dot (emerald if committed, white/20 otherwise), epic name (dim if planned-only), then a `relative h-full` lane that maps `row.segments` to **one `<GanttBar>` per segment**, each independently positioned:

```ts
const leftPct = (segment.startDate.getTime() - rangeStart.getTime()) / totalMs * 100;
const widthPct = (segment.endDate.getTime() - segment.startDate.getTime()) / totalMs * 100;
```

Sprint gaps for an epic are naturally empty space between absolutely positioned bars — no extra rendering.

Today line: absolutely positioned `w-px bg-amber-400/60` with small "today" label, only when within range.

## `GanttBar.tsx`

Props:

```ts
interface GanttBarProps {
  segment: GanttSegment;
  epicName: string;
  isCommitted: boolean;
  leftPct: number;
  widthPct: number;
}
```

**Absolute wrapper** positioned via `left: ${leftPct}%`, `width: ${widthPct}%`, with `padding: '0 4px'` so adjacent segments don't render edge-to-edge. Defensive early-return: if `segment.total === 0`, render `null`.

Inner bar `h-6 rounded-full overflow-hidden flex` with `opacity-60` when `!isCommitted`. Segments left-to-right: done → for_integration → in_progress → todo, each `style={{ flex: count }}`, only if `count > 0`.

Tooltip (no own provider — provided by `GanttGrid`):
- Line 1: `{epicName}`
- Line 2: `{format(segment.startDate, "MMM d")} → {format(segment.endDate, "MMM d")}`
- Line 3: `todo: {segment.todo} · in progress: {segment.in_progress} · for integration: {segment.for_integration} · done: {segment.done}`
- Line 4: `{isCommitted ? "committed" : "planned only"}`

## Technical notes

- Reuse only: `formatHours`/`cn` from `@/lib/utils`, `remainingHours`/`memberDisciplines` from `src/features/sprints/types.ts`, shadcn `Tooltip`, `Button`, date-fns.
- No mutations, no DnD, no Supabase calls added.
- Status colours use raw Tailwind palette (fixed semantics matching the rest of the sprints feature).
- `html-to-image` is the only new dependency; only `toPng` is used.
