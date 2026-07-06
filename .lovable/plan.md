# Show Proj hours in place of FE/BE for Proj tickets

For `ticket_type === "Proj"` tickets, render the FE column as blank and the BE column with the ticket's project hours (`actual_project_hours` / `current_project_estimate`). This affects the two tables that show FE and BE hours side-by-side.

## Changes

**`src/features/tickets/list/TicketsListRow.tsx`** — In `renderCell` for `case "fe"` and `case "be"`:
- If `t.ticket_type === "Proj"`:
  - `fe` cell → render `<span className="text-dimmer text-xs">—</span>`
  - `be` cell → render `{formatHours(t.actual_project_hours)} / {formatHours(t.current_project_estimate)}`
- Otherwise, keep the existing FE/BE rendering.

**`src/features/change-requests/EpicCRRow.tsx`** — For the two hour cells (lines 38–39) and the rate cell (line 42):
- If `t.ticket_type === "Proj"`:
  - FE cell → `—`
  - BE cell → `formatHours(t.current_project_estimate)`
  - Rate cell (when `ratePerHour` is set) → use `current_project_estimate * ratePerHour` instead of FE+BE sum.
- Otherwise, keep existing rendering.

## Out of scope

- Column headers stay "FE" / "BE" (no header retitling per row).
- No changes to sorting, filtering, CSV export, capacity math, planning pool, dev columns, MyWork (already shows "—" for Project slot), Portal, or health rollups.
- No DB or schema changes.
