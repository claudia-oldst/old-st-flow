## Goal

Allow PMBAs to export all project data to a multi-tab Excel workbook, accessed via a small download icon next to the project settings cog in the workspace header. The export supports a date range (project start → user-picked end date) so estimates and actuals reflect the state of the project as of that end date.

## UX

**Workspace header (PMBA only)**
- New icon button (`Download` icon, ghost variant, same height as settings cog) placed immediately to the left of `ProjectSettingsDialog` trigger in `src/pages/ProjectWorkspace.tsx`.
- Tooltip: "Export project data".
- Click → opens an `ExportProjectDialog`.

**ExportProjectDialog**
- Title: "Export project data"
- Body:
  - Read-only "From" date showing the project start (defaults to project's `start_date`, or the project's earliest ticket `created_at` if `start_date` is null). Editable as a fallback.
  - "As of" date picker (shadcn DatePicker, defaults to today). Defines the cutoff for all "as of" calculations.
  - Three checkboxes (all on by default): Tickets, Change Requests, Time Logs — lets the user skip tabs.
  - Helper text: "Estimates and actuals are computed as of the selected date."
- Footer: `Cancel` and `Download .xlsx` (disables while generating, shows a spinner).
- On success: toast "Export ready", file downloads, dialog closes.

## Export contents (per tab)

All three tabs are filtered by `as_of` (everything ≤ end-of-day of the picked date).

**Tab 1 — Tickets**
Columns: `Ticket ID` (formatted_id), `Ticket Type`, `Ticket Name` (title), `Epic`, `FE Original Estimate`, `BE Original Estimate`, `Project Original Estimate`, `Updated FE Estimate`, `Updated BE Estimate`, `Updated Project Estimate`, `FE Status`, `BE Status`, `FE Actual`, `BE Actual`, `Project Actual`, `Assignees`.

- "Updated …" estimates are computed as `original + Σ(approved estimate_changes.delta WHERE created_at ≤ as_of)` per discipline. (Project discipline is not currently in `ticket_estimate_changes` — falls back to `current_project_estimate`.)
- "… Actual" hours = `Σ(time_logs.hours WHERE ticket_id = … AND discipline = … AND logged_at ≤ as_of)`.
- "FE/BE Status" = current value (snapshotting status history is out of scope; the table doesn't store it).
- `Assignees` = comma-separated `Name (Slot)`, e.g. `Alice (FE), Bob (BE)`.
- Only includes tickets with `created_at ≤ as_of`.

**Tab 2 — Change Requests**
Source: `ticket_estimate_changes` joined with `tickets` (project filter) and `team_members` for the requester.
Columns: `Ticket ID`, `Ticket Type`, `Ticket Name`, `Epic`, `Discipline`, `Previous Hours`, `New Hours`, `Delta`, `Status` (approved/pending/rejected), `Assignee Requested` (the requester `team_members.name`), `Reason`, `Date` (`created_at`).
Filter: `created_at ≤ as_of`. Sorted ascending by date.

**Tab 3 — Time Logs**
Source: `time_logs` joined with `tickets` (project filter) and `team_members`.
Columns: `Ticket ID`, `Ticket Type`, `Ticket Name`, `Epic`, `Discipline`, `Hours Logged`, `Assignee Logged` (`team_members.name`), `Source` (timer/manual), `Note`, `Date` (`logged_at`).
Filter: `logged_at ≤ as_of`. Sorted ascending by date.

## Implementation

**New file**: `src/features/project/ExportProjectDialog.tsx`
- Props: `{ open, onOpenChange, project: Project }`.
- Uses shadcn `Dialog`, `Calendar`/`Popover` (matching the pattern in `DateRangeControl.tsx`), `Checkbox`, `Button`.
- Internal `generate()`:
  1. Resolve `fromDate` (project.start_date or earliest ticket created_at) and `asOf` (end-of-day of picker value).
  2. Parallel-fetch from Supabase, scoped to project + `as_of`:
     - `tickets` with joined `epic:project_epics(epic_name)`, `assignees:ticket_assignees(slot, member:team_members(name))`, `status:statuses(name)`.
     - `ticket_estimate_changes` joined with `ticket:tickets!inner(formatted_id, title, ticket_type, project_id, epic:project_epics(epic_name))` and `user:team_members(name)`, filtered `ticket.project_id = projectId`, `created_at ≤ as_of`.
     - `time_logs` with the same shape of joins, filtered `logged_at ≤ as_of`.
  3. Compute per-ticket adjusted estimates and actual hours by aggregating the change-request and time-log result sets in JS (one pass each, keyed by ticket_id), so we don't issue N queries.
  4. Build three `aoa` (array-of-arrays) tables and feed them to **SheetJS (`xlsx`)** via `XLSX.utils.aoa_to_sheet` + `XLSX.utils.book_new` + `XLSX.utils.book_append_sheet`. Set basic column widths.
  5. `XLSX.writeFile(wb, '<acronym>-export-<YYYY-MM-DD>.xlsx')`.
- Toast + close on success; toast.error on failure.

**Edit**: `src/pages/ProjectWorkspace.tsx`
- Import `ExportProjectDialog` and `Download` icon.
- Add `const [exportOpen, setExportOpen] = useState(false)`.
- In the right side of the header (before `ProjectSettingsDialog`), render — gated by `canEdit` (PMBA):
  ```tsx
  <Button variant="ghost" size="icon" onClick={() => setExportOpen(true)} aria-label="Export project data">
    <Download className="h-4 w-4" />
  </Button>
  ```
- Render `<ExportProjectDialog open={exportOpen} onOpenChange={setExportOpen} project={project} />`.

**Dependency**: add `xlsx` (`bun add xlsx`). It's a well-supported, browser-friendly, ~600 KB minified library; no native deps. Generation runs entirely client-side.

## Out of scope

- CSV-only export option (xlsx covers all needs and supports tabs).
- Historical FE/BE status snapshots (the schema doesn't track status history).
- Server-side / edge-function export — current data volumes don't require it.
- Permission changes beyond the existing `isPMBA(role)` check.
