# Sprint Planning Rework

## Scope

Replace the current Sprints page's "Sprint Forecasting & Pooling" + "Sprint Workbench" tabs with **Roadmap** and **Planning**. Roadmap stays structurally identical (forecasting calendar + pooling table). Planning is a full rewrite: per-discipline (FE/BE) view, all devs visible at once as tight list columns, no DnD, no kanban cards, with carryover review and scoped bulk actions.

## Files

### Delete
- `src/features/sprints/SprintBoardColumn.tsx`
- `src/features/sprints/SprintColumnToolbar.tsx`
- `src/features/sprints/SprintBulkBar.tsx` (if present)

### New
- `src/features/sprints/CapacityIndicator.tsx` — extracted from current `SprintWorkbench`. Signature `{ used, cap }`, red bar when over.
- `src/features/sprints/CarryoverReviewPanel.tsx` — collapsible per-dev banner listing unfinished tickets from prior sprints; checkbox list; "Confirm carryover" calls `addTicketToLane` per checked ticket. Read-only for non-PMBA.
- `src/features/sprints/PlanningPoolPanel.tsx` — fixed `w-72` left panel. **Do not import `SprintColumnToolbar`** (it's being deleted) — inline the search `Input` + `TicketsFilter` directly, same pattern as `SprintPoolingTable.tsx`. Uses `TicketsList` with `groupBy="none"` by default, plus a "Group by epic" toggle in the toolbar. Filtered to tickets roadmapped to the selected sprint+discipline, excluding any already assigned in any dev column.
- `src/features/sprints/PlanningDevColumn.tsx` — one column per dev: header (name, role chip, `CapacityIndicator`, red overage when used > cap), `CarryoverReviewPanel` if any carryover, then tight `<div>` rows (checkbox, formatted_id, title, epic chip, remaining hours; `↩` prefix for carried-over). Row click opens ticket; checkbox toggles selection.

### Modified
- `src/features/sprints/SprintsPage.tsx` — rename tabs: `forecast`→`roadmap` ("Roadmap"), `workbench`→`planning` ("Planning"). No structural change.
- `src/features/sprints/SprintPoolingTable.tsx` — add two `BulkMenu` entries to existing bulk bar: **Clear FE** → `updatePool(ids,"FE",null)` and **Clear BE** → `updatePool(ids,"BE",null)`. No other changes.
- `src/features/sprints/SprintWorkbench.tsx` — full rewrite (see below).
- `src/features/sprints/useSprintBoard.ts` — add `useCarryoverTickets(projectId, sprintId, userId, allSprints)` derived from existing `useProjectSprintTickets` + `useProjectTickets` query caches (no new Supabase calls).
- `src/features/sprints/SprintSelectionContext.tsx` — extend state with `source: "pool" | "dev" | null`; selecting in one source clears the other.

### Untouched (reused as-is)
`ForecastingCalendar`, `dnd.ts`, `usePoolData`, `types`, `BulkActionsBar`, `BulkMenu`/`BulkMenuRow`, `TicketsList`, `TicketsListRow`, `TicketsListHeader`, `TicketsFilter`, `TicketDetailSheet`, everything in `src/features/tickets/`.

## Planning tab — `SprintWorkbench.tsx` rewrite

### State
- `targetSprintId` (default `sprints[0].id`)
- `discipline: "FE" | "BE"` (default `"FE"`)
- `openTicket: TicketRow | null`
- Selection via `SprintSelectionProvider` with `source` field

### Top bar
```text
[ Sprint N ▾ ]   [ FE | BE ]   Total: {pooled}h / {totalCap}h  [capacity bar]
```
`totalCap` = sum of dev capacities for discipline in this sprint. `pooled` = sum of remaining hours across all `sprint_tickets` for sprint+discipline.

### Body
```text
flex flex-row gap-3 h-[calc(100vh-280px)] min-h-[560px]
┌──────────┬───────────────────────────────────────┐
│  Pool    │  Dev A   Dev B   Dev C   …            │
│  w-72    │  flex-1 overflow-x-auto, min-w-56 ea. │
└──────────┴───────────────────────────────────────┘
```

### Bulk action bar (when selection non-empty)
Always render `BulkActionsBar` (canEdit={isPMBA}) + a second floating bar at `bottom-20` (`glass-strong`):

- `source === "pool"`:
  - **Assign to →** dev list → `addTicketToLane(sprintId, ticketId, dev.user_id, discipline)`
  - **Move to Sprint →** other sprints → update `planned_sprint_{fe|be}_id`
- `source === "dev"`:
  - **Carry over** → `addTicketToLane` for the next-numbered sprint. If no next sprint exists, disable the button and show tooltip / on-click toast: `"No next sprint exists — create one in the Roadmap tab first."`
  - **Move to Sprint →** updates `planned_sprint_*_id` and removes current `sprint_tickets` row
  - **Remove** → `removeTicketFromSprint` per selected

### Data hooks
`useSprintCapacities`, `useSprintTickets`, `useProjectMembers`, `usePlannedSprintAssignments`, `useProjectTickets`, plus new `useCarryoverTickets` per dev column.

### Invalidation
After mutations: `["sprint_tickets"]`, `["project_sprint_tickets"]`, `["planned_sprint_assignments", projectId]`.

### Remaining-hours formula
- FE: `Math.max(0, current_fe_estimate - actual_frontend_hours)`
- BE: `Math.max(0, current_be_estimate - actual_backend_hours)`

## Notes
- No changes outside `src/features/sprints/`.
- No DnD anywhere in Planning tab — purely checkbox + bulk action driven.
- Pool panel hides tickets present in any dev column (`allDevTicketIds` union).
