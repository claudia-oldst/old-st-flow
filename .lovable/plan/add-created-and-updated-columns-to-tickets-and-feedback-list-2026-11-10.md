# Add "Created" and "Updated" columns to Tickets and Feedback lists

## What you'll get
- Two new columns, **Created** and **Updated**, in the list view of both the Tickets tab and the Feedback tab.
- They're **hidden by default**. Turn them on from the existing column display menu.
- Click either header to sort by that date, newest or oldest first.
- Dates show as short day/month/year (for example 10/11/2026), with the full date and time on hover.

## How it works
- The ticket list already supports sorting by created and updated dates, so nothing changes in the database.
- Both dates come from the tickets themselves, so no extra data is stored.

## Technical details
- `list/columns.ts`: add the ColKeys `created_at` and `updated_at` with a width and sort key matching `list_project_tickets` (`created_at` / `updated_at`).
- `useColumnDisplayPrefs.ts`: add both to TOGGLEABLE_COLS, default them to `false` in DEFAULT_COLUMN_PREFS, and change `isAllColsOn` so it no longer counts columns that are off by default. Saved preferences keep working because they're merged over the defaults.
- `TicketsListHeader.tsx` / `TicketsListRow.tsx`: render the sortable header and the date cell.
- `ProjectFeedback.tsx`: add both keys to its COLUMNS so Feedback gets them too, using the same menu.
- `useTicketsSort.ts` (client-side sort for grouped/board data): compare the two dates.
- Test: both columns are hidden by default, and sorting by `created_at` orders tickets by date.
