# Estimate Evolution

Sub-section of the Project Health tab — significant enough to document separately.

## Controls
- **Date range control** — preset chips (Last 30d, Last 90d, Project to date) plus a custom date picker. Sets the "as of" date used by every chart and the snapshot table.
- **Epic select** — "All" or a specific epic.

## Trend chart
- X axis: time (project start → as-of date).
- Two lines: cumulative current estimate vs. cumulative logged hours.
- Vertical markers for each estimate change (with proposer + reason in the tooltip) and CR approvals.
- A shaded band shows discount adjustments.

## Snapshot table
Below the chart, a per-epic table at the chosen "as of" date:
- Estimate at that date, hours logged by then, % consumed.
- Mini sparkline column showing the estimate history.
- Click a row to filter the trend chart to that epic.

## Behaviour
- All numbers are "as of" the chosen date — moving the date instantly recalculates everything (historical snapshot rebuild, not a re-fetch).
- Live updates: changes made elsewhere in the app re-enter the timeline immediately.
