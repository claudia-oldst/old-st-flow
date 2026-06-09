
# Sprint Planning Rework — Full Plan

## Goal
Split the Sprints page into two tabs:
1. **Sprint Forecasting & Pooling** — define sprint blocks (dates, devs, hours) and pool every project ticket into an FE sprint and/or BE sprint via a filterable list with per-row dropdowns.
2. **Sprint Workbench** — execute one sprint for one focused dev: three columns (Backlog/Pool, Carryover, Dev lane) with drag-and-drop and bulk edit.

## Cross-cutting UI principle — reuse existing ticket components
Filter, search, sort, multi-select, bulk-edit, and card rendering must look and behave the same across **every** new column/table and match the existing Tickets tab. No new bespoke filter inputs.

Reuse these existing modules from `src/features/tickets/`:
- `TicketsFilter.tsx` — full filter bar (search, epic, type, status, assignee, tags, sort) used by `TicketsList`.
- `filters/FilterPrimitives.tsx` — shared chips, popovers, search input primitives.
- `filters/applyFilters.ts` + `filters/constants.ts` — single source of truth for filtering/sorting logic.
- `TicketCard.tsx` + `CardDisplayMenu.tsx` + `useCardDisplayPrefs.ts` — card rendering and display prefs (already wired into `DraggableTicketCard`).
- `BulkActionsBar.tsx` + `bulk-actions/` + `bulk-assign/` — bulk Edit / Assign for selected tickets.
- `TicketsList.tsx` as the table reference for Tab 1's pooling table styling.
- `MultiSelectFilter` from `src/features/estimates/MultiSelectFilter.tsx` where `TicketsFilter` already uses it.
- `SprintSelectionContext` for selection state across columns.

Every new column wraps a local list with `<TicketsFilter />` (or a thin adapter exposing the same controls) bound to a column-scoped filter state, then applies `applyFilters` to the source rows. Sort options match `TicketsFilter`'s sort dropdown. Bulk bar uses `BulkActionsBar` directly.

---

## Data Model Changes

Add two columns on `tickets`:
- `planned_sprint_fe_id uuid NULL REFERENCES sprints(id) ON DELETE SET NULL`
- `planned_sprint_be_id uuid NULL REFERENCES sprints(id) ON DELETE SET NULL`
- Indexes on both columns.

Migrate existing pool rows:
- For every `sprint_tickets` row where `assigned_user_id IS NULL`, copy `sprint_id` into `planned_sprint_fe_id` / `planned_sprint_be_id` on the ticket (only into the column where the ticket has hours for that discipline).
- Delete those legacy rows so `sprint_tickets` only holds active per-dev commitments.

After migration:
- `tickets.planned_sprint_fe_id/be_id` = pooling/planning intent.
- `sprint_tickets` = active per-dev commitment.

---

## Tab 1 — Sprint Forecasting & Pooling

### A) Sprint Blocks (top)
Compact card per sprint: dates, members + capacity, pooled totals, utilisation bar.

```text
┌─ Sprint 3   [Mar 4 – Mar 17]                                  ─┐
│  Members          FE    BE                                    │
│   Alice          40h     —    [✕]                             │
│   Bob             —    40h    [✕]                             │
│   Carol          20h   20h    [✕]                             │
│   [+ Member]                                                  │
│  Capacity:  FE 60h · BE 60h · Total 120h                      │
│  Pooled:    FE 48h · BE 52h                                   │
│  Utilisation:  FE ████████░░ 80%   BE ████████▌░ 87%          │
│  [🗑 Delete sprint]                                            │
└───────────────────────────────────────────────────────────────┘
[+ Append next sprint block]
```

- Pooled totals = sum of estimates for tickets where `planned_sprint_fe_id = sprint.id` / `planned_sprint_be_id = sprint.id`.
- Bar turns coral when pooled > capacity.

### B) Ticket Pooling Table (below)
Built on the same primitives as `TicketsList`:
- Top toolbar = `<TicketsFilter />` (search, Epic, Type, Status, Assignee, Tags, Sort) + two extra chips: `FE Sprint`, `BE Sprint`, plus `Unpooled only` toggle.
- Multi-select column matches `TicketsList`'s checkbox column.
- Card column reuses `TicketCard` rendering (or list-row layout matching `TicketsList`).
- Bulk bar = `BulkActionsBar` with two extra actions: `Set FE Sprint ▾`, `Set BE Sprint ▾`, `Clear FE`, `Clear BE`.
- Per-row FE Sprint / BE Sprint dropdowns; disabled when the ticket has no hours for that discipline.

Read-only for non-PMBA.

---

## Tab 2 — Sprint Workbench

Pick a sprint + a **Focus Dev** (from `sprint_capacities`). **Three-column layout.**

```text
Sprint 3 ▾   Focus Dev: Alice ▾   Capacity: 28 / 40h ████████░░   [Card display ▾]

┌─ Backlog & Pool ───────┬─ Carryover ────────────┬─ Alice — Sprint 3 ──────┐
│ Pool: [All ▾]          │ <TicketsFilter />      │ <TicketsFilter />       │
│ <TicketsFilter />      │                        │                         │
│                        │ [#188 Profile UI 4h]   │ [#214 Login form 5h]    │
│ [#214 Login form 5h] ☑ │ [#192 Avatar upload 2h]│ [#230 Nav 8h]           │
│ [#221 Settings 3h]   ☑ │ ...                    │ ...                     │
│ [#240 Search bar 2h] ☐ │                        │                         │
│                        │                        │                         │
│ <BulkActionsBar />     │ <BulkActionsBar />     │ <BulkActionsBar />      │
│ + Move FE/BE ▾         │ (Edit only)            │ + Remove                │
└────────────────────────┴────────────────────────┴─────────────────────────┘
```

Each column instantiates its own `<TicketsFilter />` with column-scoped state. Card display prefs are shared via `useCardDisplayPrefs` (one global toggle at the page header).

### Column 1 — Backlog & Pool
- Extra **Pool source dropdown** above the filter bar: `Unassigned`, `Sprint <current> pool`, `Sprint N pool`, `Any sprint pool`.
- Source filtered by the focused dev's discipline(s).
- Excludes tickets shown in Carryover or Dev columns.
- Multi-select + drag source. Bulk bar adds `Move ▾` (set/clear FE/BE pool sprint).

### Column 2 — Carryover
- Source: tickets where the focused dev is in `ticket_assignees`, has a `sprint_tickets` row in a **prior** sprint, **no** row in the current sprint, and is in a non-done state for their discipline.
- Drag source only. Drop into Column 3 creates `sprint_tickets(sprint = current, ticket, assigned_user_id = focused dev)`.
- Bulk bar = standard `BulkActionsBar` (Edit only — no Move, no Remove).
- Nothing is auto-created on open.

### Column 3 — Focused dev lane
- Source: `sprint_tickets` for `(current sprint, focused dev)`.
- Capacity bar reads `sprint_capacities` for `(sprint, focused dev)`; consumed = sum of estimates of cards in this column.
- Drop target for Columns 1 and 2. Drop → insert/update `sprint_tickets` and add the dev to `ticket_assignees` (existing `addTicketToLane`).
- Bulk bar adds `Remove` (deletes `sprint_tickets` rows for this sprint).

---

## File Changes

- `supabase/migrations/<new>.sql` — add columns, indexes, backfill, delete legacy pool rows.
- `src/features/sprints/SprintsPage.tsx` — rename tabs.
- `src/features/sprints/ForecastingCalendar.tsx` → `SprintForecastingTab.tsx`; add utilisation summary; render new pooling table below.
- `src/features/sprints/SprintPoolingTable.tsx` (new) — Tab 1 table built on `TicketsFilter` + `TicketsList` layout + `BulkActionsBar` with FE/BE sprint dropdowns and extensions.
- `src/features/sprints/SprintWorkbench.tsx` — replace layout with 3-column Focus Dev board.
- `src/features/sprints/WorkbenchBacklogColumn.tsx` (new) — pool-source dropdown + `TicketsFilter` + draggable cards.
- `src/features/sprints/WorkbenchCarryoverColumn.tsx` (new) — `TicketsFilter` + draggable cards.
- `src/features/sprints/WorkbenchDevColumn.tsx` (new) — `TicketsFilter` + drop target + capacity bar.
- `src/features/sprints/SprintBulkBar.tsx` (new, thin wrapper around `BulkActionsBar`) — exposes column-specific extras (Move / Remove) via slots.
- `src/features/sprints/dnd.ts` — keep `addTicketToLane` / `removeTicketFromSprint`; remove unused pool writes.
- `src/features/sprints/useSprintBoard.ts` — add queries: pooled tickets per sprint/discipline, carryover detection, per-sprint pooled-hour totals.

No new filter, search, sort, or bulk components are created — all reuse `src/features/tickets/*`.

---

## Out of Scope
- No changes to the hours/capacity model.
- No drag/drop on Tab 1.
- No ticket card visual redesign.
- No changes to the ticket detail page or to `TicketsFilter` / `BulkActionsBar` internals (only consumed).
