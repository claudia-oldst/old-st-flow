# Rework Change Requests and Estimate Revisions tabs

## What stays the same
- Each tab keeps its current table columns, and the hovers work the way they do now.
- Approve / Reject buttons, the reject reason window and opening a ticket from a row all stay.
- No database changes.

## What changes (both tabs)
Both tabs get the same toolbar and list behaviour as the main Tickets table:
- **Search box** (ticket number or title).
- **Filters**: Status (Approval status) defaults to **Pending + Approved**. Requester and the date range stay.
- **Group by**: None, Epic, Approval status, Requester. Default is **Epic**.
- **Collapsible group headers** like the Tickets table, with the count of rows in each group. Groups stay in the project's epic order.
- **Sortable columns** and **column show/hide**, saved per tab like Tickets.
- Requester on Change Requests means the person who created the CR ticket.

## Epic analytics (only when grouped by Epic)
- Each epic group header gets a small **"Show analytics"** toggle. It is **collapsed by default**, so the tickets come first.
- Expanding shows the existing cards (Original, Current approved, If all approved, Actual, discount line) and the trend graph.
- **Graph time span:** starts just before the epic's first request (a few days earlier, so you can see the starting point) and ends today on the right. It no longer follows the date-range filter, so you always see the full picture.

```text
[Group by: Epic v] [Status: Pending, Approved v] [Requester v] [Dates] [Search] [Columns]
v Epic: Login flow (4)                         [Show analytics v]
   | (cards + graph, when expanded)            |
   | table rows: same columns as today         |
> Epic: Payments (2)
```

## Technical details
- New shared `src/features/_shared/review-list/`: `ReviewListToolbar` (reuses `GroupBySelect` with a new options list, `MultiSelectFilter`, `DateRangeControl`, search, `ColumnDisplayMenu`), `ReviewGroupSection` (collapsible header reusing the Tickets group header styles, optional analytics slot), and `useReviewGrouping` (pure grouping by epic/status/requester + sort; unit tested).
- `GroupBy` options extended with `approval` and `requester` labels used only here; tickets list unaffected.
- `EpicReviewCard` is split: the stats + `EpicMiniTrendChart` become `EpicAnalyticsPanel`; the table rows (`EpicCRRow`, `EpicChangeRow`) are reused inside the group sections unchanged so columns and hovers stay identical.
- Chart range: replace `resolveChartRange` so start = first request date minus a small padding (about 5% of the span, at least 2 days) and end = now, ignoring the filter range. Update `useEpicChange`/`useEpicCR` tests accordingly.
- `ProjectChangeRequests.tsx` and `ProjectChangeRequestTickets.tsx` rewritten on the shared pieces, each kept under 250 lines; epic pagination replaced by the grouped list (with per-group row paging kept for big groups).
- Column visibility stored in local prefs under per-tab keys, same mechanism as `useColumnDisplayPrefs`.
- Tests: grouping (default Epic, status default pending+approved filter), chart range start before first request and end today.
