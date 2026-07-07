# Fix Client Portal: 0h/0h totals and hidden scope-change panels

## Problems

### 1. Every epic reads "0h / 0h"
The portal RPCs (`get_client_portal`, `get_project_portal_preview`) compute epic totals like:

```sql
SUM(tr.current_fe_estimate + tr.current_be_estimate + tr.current_project_estimate)
```

In the database, disciplines a ticket doesn't use are stored as `NULL`, not `0`:
- Standard/Bug tickets → `current_project_estimate` is NULL
- Proj tickets → `current_fe_estimate` and `current_be_estimate` are NULL

Because `x + NULL = NULL` in SQL, the per-row expression evaluates to NULL for essentially every ticket, `SUM` drops all of them, and the epic ends up showing 0h. Confirmed on Project Cousteau R1: 633 Standard tickets with real FE/BE estimates all collapse to NULL because their project estimate is NULL.

The same bug hits `original_estimate`, `actual_hours`, and all `totals.*` roll-ups in both RPCs.

### 2. Epic "scope changes" panel never opens
`PortalEpicRow` only becomes expandable when `current_estimate - original_estimate !== 0`. Two things stop that from happening:

- Bug #1 above zeroes both sides, so delta is always 0.
- Even when totals are non-zero, approved CR tickets are counted as ordinary rows: their `original_*` equals their `current_*`, so they contribute to both sides equally and produce no delta.

The result: the PMBA-authored scope-change write-up (`pmba_text`) stays hidden.

## Fix

### RPCs — `get_client_portal` and `get_project_portal_preview`

1. **NULL-safe arithmetic.** Wrap every estimate column with `COALESCE(..., 0)` before adding. Applies to `epic_rows.current_estimate`, `epic_rows.original_estimate`, `epic_rows.actual_hours`, and all `totals.*` sums (`original_total`, `current_total`, `fe_estimate`, `be_estimate`, `proj_estimate`, `cost_estimate`, etc.).

2. **Treat CRs as deltas, not baseline scope**, matching `buildTrendSeries`:
   - Exclude non-approved CR tickets from `ticket_rows` entirely: `AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')`.
   - For approved CR tickets, contribute their estimates to `current_estimate` only (and only when `COALESCE(cr_decided_at, created_at) <= cutoff`). Set their `original_*` contribution to 0.
   - Exclude CR tickets from the counters (`total_tickets`, `done_tickets`, `in_progress_tickets`, `backlog_tickets`, and the FE/BE discipline status counts) — they're scope requests, not deliverable work.
   - `time_logs`-derived actuals are unaffected.

### Front-end
No logic change needed once the RPC is corrected — the existing `delta !== 0` gate in `PortalEpicRow` will open the panel and render `pmba_text`.

Small polish: also allow expansion when `pmba_text` is set even if delta is 0 (PMBA may want to add commentary on a rescoped-but-net-zero epic). Gate becomes `hasDelta || (epic.pmba_text?.trim().length ?? 0) > 0`.

## Out of scope
- No changes to the trend chart (`buildTrendSeries`, `fetchTrendData`) — already correct.
- No changes to discounts, rate, cost formulas, or the internal Health / Estimate Evolution pages.
- No schema or CR-workflow changes.

## Verification
- Public portal and PMBA editor preview both show real hours (not 0h/0h) for Project Cousteau R1.
- Epics with approved CRs show `current > original` and a delta chip; clicking expands the panel with the PMBA scope-change text.
- Progress bars reflect only real tickets, not CR requests.
- Trend chart cutoff value matches the epic table "current" number.
