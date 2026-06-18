# Sprint columns: show active sprints over planned

Change the `fe_pool` / `be_pool` columns in the tickets list to display the sprint(s) where a ticket is actively being worked on (committed `sprint_tickets` rows). Fall back to the planned sprint when nothing is committed. Carryovers naturally surface as multiple sprint numbers.

## Visual

- **Active sprint(s)** — lit accent badge: `bg-accent/15 text-accent`, label `S{n}`
- **Planned sprint (fallback)** — ghost badge: `bg-white/5 text-dim`, label `S{n}` (matches existing version badge style)
- Multiple active sprints render as a wrapping row of small chips in one cell
- Column labels rename from `FE Pool` / `BE Pool` → `FE Sprint` / `BE Sprint`

## Files

### `src/features/tickets/list/poolData.ts`
Extend `PoolData` additively:
```ts
export interface PoolData {
  byTicket: Map<string, { fe: string | null; be: string | null }>;
  sprintsById: Map<string, { sprint_number: number }>;
  activeByTicket: Map<string, { fe: number[]; be: number[] }>;
}
```

### `src/features/sprints/usePoolData.ts`
Reuse already-cached `useProjectSprintTickets` and `useProjectMembers` (no new Supabase queries). Build `activeByTicket` by walking `sprint_tickets`, resolving the assigned dev's disciplines via `memberDisciplines(member.role)`, and pushing the sprint's `sprint_number` onto the relevant FE/BE list. Dedupe + sort ascending.

### `src/features/tickets/list/TicketsListRow.tsx`
Update the `fe_pool` / `be_pool` case in `renderCell`. Inline `<span>` only — no new component. If `activeNums.length > 0` render accent chips; otherwise fall back to planned-sprint ghost chip; otherwise em-dash.

### `src/features/tickets/list/columns.ts`
Rename labels:
- `fe_pool.label` → `"FE Sprint"`
- `be_pool.label` → `"BE Sprint"`

### `src/features/tickets/list/useTicketsSort.ts`
Sort `fe_pool` / `be_pool` by the **lowest active sprint number** when present, else the planned sprint number, else `MAX_SAFE_INTEGER`.

## Out of scope

- No new Supabase queries
- No `SprintBadge` / `SprintChip` component — inline span pattern only
- No changes to `SprintPoolingTable` filter selects (planned intent is still correct there)
- No changes to `applyFilters.ts`, `TicketsList.tsx`, `ProjectTickets.tsx`, or sprint planning components
- `activeByTicket` is additive; existing `PoolData` callers unaffected
