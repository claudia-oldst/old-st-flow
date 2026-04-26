# Member Capacity Date Range Filter

Add a date range picker to the **Member capacity** card on the Project Health page. The range filters two columns:

- **Assigned** — only count tickets where the member's assignee row was created within the range, AND only count remaining hours for slots whose discipline is not yet `done`.
- **Logged** — sum of `time_logs.hours` for that user on this project's tickets where `logged_at` falls within the range.

The **Open tix** column stays as-is (it's a current-state snapshot, not period-based).

## UX

In the Member capacity card header (next to "Member capacity"), add a compact date range control:

- Two popover date pickers ("From" / "To") using the shadcn `Calendar` component, shown inline with small triggers.
- Quick presets: **Last 7 days** (default), **Last 14 days**, **Last 30 days**, **This month**, **Custom**.
- Default range on first load: **Last 7 days** (matches the existing "Logged" behavior, so nothing visually changes by default).
- Small label under the table (or as a tooltip on the column headers) clarifying: "Assigned and Logged are scoped to {from} – {to}."

Layout stays the same (the three columns: Open tix / Assigned / Logged).

## Data changes

### 1. Fetch assignee `created_at`
`useProjectTickets` already selects `*` from `ticket_assignees`, so `created_at` is returned but dropped when grouped. Update the grouping in `src/features/tickets/useProjectTickets.ts` to include `created_at` on each assignee:

```ts
assignees: Array<{ user_id; slot; member; created_at: string }>
```

### 2. Fetch time logs in the chosen range
In `ProjectHealth.tsx`, replace the hard-coded 7-day `time_logs` query with one driven by the selected range (`gte logged_at = from`, `lte logged_at = to`). Re-run the query whenever the range changes.

### 3. Recompute `remainingByMember` (Assigned column)
Filter each assignee by `created_at >= from && created_at <= to` before adding remaining hours. The existing rule of skipping slots with status `done` stays.

### 4. Keep `ticketsByMember` (Open tix) unchanged
This is a current snapshot and should not depend on the range.

## Files to edit

- `src/features/tickets/useProjectTickets.ts` — include `created_at` on each assignee in the grouped output, and add it to the `TicketRow.assignees` type.
- `src/features/health/ProjectHealth.tsx`:
  - Add `from` / `to` state with a Last-7-days default.
  - Add a small `DateRangeControl` (presets + two shadcn popovers) in the Member capacity card header.
  - Drive the `time_logs` fetch from the range.
  - Filter `remainingByMember` by assignee `created_at` within the range.
  - Update column header tooltips to mention the active range.

No database changes required — `ticket_assignees.created_at` and `time_logs.logged_at` already exist.

## Caveats to flag in the UI

- "Assigned" reflects when the assignee row was created; reassignments after the range won't be counted, and assignments made before the range won't appear even if the member is still working on them. A small info tooltip will state this so the metric is interpreted correctly for capacity planning.
