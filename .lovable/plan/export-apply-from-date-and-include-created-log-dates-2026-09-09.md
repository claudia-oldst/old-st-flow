# Export: apply From date and include created/log dates

## Goal
The Export Project dialog has a "From" date field that is currently ignored. Wire it through so the time-log export covers **00:00 on the From date → 23:59 on the As-of date**, and add created-date columns to the exported sheets.

## Changes

### ExportProjectDialog.tsx
- Pass `fromDate` into `runExportProject` (as a `Date`, or `null` when the field is empty = "all time").

### export/runExportProject.ts
- Accept optional `from: Date | null` in `RunArgs`.
- Time logs query: add `.gte("logged_at", startOfDay(from).toISOString())` when set; keep the existing `.lte("logged_at", endOfDay(asOf))` — giving the requested 00:00 → 23:59 window.
- Apply the same From filter to Change Requests (`created_at`) and Tickets (`created_at`) so the whole export respects the date range consistently.
- **Tickets sheet**: add a "Created" column (formatted `yyyy-MM-dd`) after the ticket metadata.
- **Time Logs sheet**: keep the existing "Date" (logged date) column and add a "Created" column (`created_at`, formatted `yyyy-MM-dd HH:mm`) so both the log date and record-creation date are visible. This requires selecting `created_at` in the logs query.
- **Change Requests sheet**: add a "Created" column alongside the existing "Date" column.
- Update filename to include the from date when set, e.g. `OLD-export-2026-01-01-to-2026-09-09.xlsx` (fallback to current `OLD-export-<asOf>.xlsx` when no from date).
- Widen the matching `!cols` entries for the new columns.

### Tests (runExportProject.test.ts)
- Update existing test args with `from: null`.
- Add a test asserting the gte/lte filters and that the new Created columns appear in rows.

## Wireframe

```text
Export project data
┌─────────────────────────────────────────────┐
│  From [ 2026-01-01 ]   As of [ Sep 9, 2026 ]│
│  Time logs included: 00:00 on From date     │
│  through 23:59 on As-of date.               │
│                                             │
│  Include tabs                               │
│   [x] Tickets        (+ Created column)     │
│   [x] Change Requests (+ Created column)    │
│   [x] Time Logs      (Logged + Created)     │
│                                             │
│              [ Cancel ]  [ Download .xlsx ] │
└─────────────────────────────────────────────┘
```

## Notes
- No database changes; purely client-side export logic.
- Clearing the From date exports all history up to the As-of date (current behaviour).
