# Team time export (Admin > Team)

## What you'll get
- A new **Export time** button on Admin > Team, next to "Add member".
- It opens the same style of export window used for bulk project export:
  1. **Start date** and **End date** pickers.
  2. A **searchable checklist of all team members**, with Select all / Clear.
  3. **Export** button that downloads an Excel file.
- Each row is one person + one project + one ticket, with their total hours on that ticket in the period.
- A day counts as 00:00-23:59 in the **person's own local time when they logged it** (so a 23:30 log in Johannesburg counts for that day, not the next UTC day).
- Feedback tickets are excluded, matching billing and reports.

## Spreadsheet layout
Columns are placed exactly in the letters you gave, with headers; the other columns stay empty so the sheet lines up with your existing template:

```text
A: Project   D: Ticket (e.g. COU-934 - Title)   E: Name   G: Email   O: Logged hours
```
Sorted by Name, then Project, then Ticket. If you'd rather have the five columns side by side (A-E), say so before approving.

## Technical details
- New `src/features/admin/team-export/` (dialog, data loader, workbook builder), reusing `xlsx`, the shared Dialog, Checkbox, Input and the `downloadBlob` pattern from `BulkExportDialog`.
- Load `time_logs` for selected users in 1,000-row pages, with a UTC window widened by +/-14h, then filter client-side by local date using `logged_at + logged_tz_offset` (fall back to UTC when offset is missing). Join ticket formatted_id/title/type and project name; skip Feedback.
- Pure aggregation + local-date function with unit tests (local-day boundary, missing offset, Feedback excluded, grouping sums).
- No database changes.
