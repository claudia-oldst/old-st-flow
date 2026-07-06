## Problem

In the project Tickets list view, grouping by **Type** only shows a "Standard" bucket, and filtering by Bug/CR/Project can look empty.

Root cause: the list uses **server-side pagination** (`useProjectTicketsPaged`, sorted by `position asc`, ~50/page). With 1,879 Standard vs 22 Bug / 5 CR / 66 Proj, page 1 is all Standard, so grouping (which runs client-side over the current page) never sees other types.

The filter UI and the `list_project_tickets` RPC handle `types` correctly — the issue is that grouping operates on one page at a time.

## Fix (frontend only)

Bypass server pagination whenever the list is grouped; render from the already-loaded full set. Keep server pagination only when **Group by = None**.

### Changes

1. **`src/features/tickets/ProjectTickets.tsx`**
   - Compute `grouped = v.groupBy !== "none"`.
   - When `grouped`: feed `TicketsList` from `v.visibleTickets` (with the same FE/BE planned/committed sprint predicates currently applied to `paged.rows`), and hide `ListPagination` + the "Showing X–Y of N" footer.
   - When not grouped: keep the current `useProjectTicketsPaged` flow untouched.
   - Disable the paged RPC when grouped (pass `undefined` projectId) to avoid a wasted round-trip.
   - Use the existing `loading` from `useProjectTickets` for the grouped path's skeleton/empty state.

2. No changes to `TicketsList`, `useTicketsGrouping`, filters, RPC, or DB.

### Why this is safe

- `useProjectTickets(projectId)` is already loaded on this page (board, CSV import, quick-add, group-timer), so no new large fetch is introduced.
- Grouped rendering is already client-side, so operating over the full filtered set is consistent with Epic / Status / Assignee grouping expectations.
- Ungrouped list keeps server pagination for large projects.

### Out of scope

- Sprints Planning pool, Board, RPC, schema.
- Server-side "grouped pagination" — deferred until needed.

## Verification

- List view, **Group by = Type** → all four buckets render with correct counts.
- **Group by = Epic / Status / Assignee** → buckets span every ticket, not just page 1.
- **Group by = None** → server pagination + footer unchanged.
- Filter Type = Bug (any grouping) → Bug tickets show.
