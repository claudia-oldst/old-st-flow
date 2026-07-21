## Goal

Add a single shared Filter + Group control that governs the assigned-ticket lists inside every developer column on the Sprint Planning tab. One control set applies to all dev columns simultaneously — no per-column duplication.

## UX

New slim toolbar strip sits directly above the row of developer columns (inside the body area, to the right of the Pool panel). It stays sticky above the scrollable columns row.

```text
[Pool ...] │ [ Search ] [ Filter ▾ ]  GROUP [ None ▾ ]
           │ ─────────────────────────────────────────
           │ [Dev A col] [Dev B col] [Dev C col] ...
```

- **Search** — filters by ticket ID / title.
- **Filter** popover — reuses the existing `TicketsFilter` shape (Epic, Type, Status multi-selects) used by the Pool's `PoolFilterBar` for consistency.
- **Group by** dropdown — options: `None`, `Epic`, `Type`, `Status`. Applies inside every dev column: matching tickets are rendered under a small group header (same style as the Pool's group headers). Empty groups are hidden. Sort order matches the Pool (`usePoolGroups` style: no-epic last, etc.).
- Ticket count next to Filter label shows how many tickets are visible across all dev columns (e.g. `12 tickets`).
- Filter/group state is per project (persisted via `usePersistentState`, key `sprint-planning:dev-cols:*`) and is independent of the Pool's own filter state.
- Carryover panel inside each column is unaffected — filters only apply to `assignedTickets`.

## Technical

1. **New component `src/features/sprints/planning-dev/DevColumnsToolbar.tsx`** — search input + Filter popover (reuse `TicketsFilter` component or inline the same multi-selects used by `PoolFilterBar`) + Group-by dropdown. Emits `{ search, filters, groupBy }`.

2. **New hook `src/features/sprints/planning-dev/useDevColumnGroups.ts`** — mirrors `usePoolGroups` but scoped to dev-column groupings (`none | epic | type | status`). Returns `PoolGroup[]` for a given ticket array.

3. **`SprintWorkbench.tsx`**
   - Add persistent state: `devColSearch`, `devColFilters` (`TicketFilters`, default `EMPTY_FILTERS`), `devColGroupBy` (default `"none"`), all keyed by `projectId`.
   - Render `<DevColumnsToolbar>` above the dev-columns row (same flex row as Pool, or a wrapping column so the toolbar spans the dev-columns area only).
   - Pre-filter each dev's `assignedTickets` with `applyFilters(...)` + search before passing to `PlanningDevColumn`. Also pass `groupBy` through.

4. **`PlanningDevColumn.tsx`**
   - New prop `groupBy: "none" | "epic" | "type" | "status"`.
   - When `groupBy !== "none"`, run `useDevColumnGroups` over `assignedTickets` and render group headers (reuse the Pool's header markup: `text-[10px] uppercase tracking-wide text-dim font-semibold` + count + hairline).
   - `usedHours` / capacity math is unchanged — it stays based on the full `assignedTickets` list so capacity remains truthful even while filtering hides rows. (Filter is a view lens, not a scope change.)

5. No DB, RLS, or query changes. Purely presentational.

## Out of scope

- Per-column filters.
- Changing capacity math based on filters.
- Filtering the carryover review panel.
