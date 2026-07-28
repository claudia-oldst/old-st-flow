## What's wrong

Project Prism 2 has 10 tickets: 5 Standard (44h of FE/BE estimate) and 5 **Proj** tickets carrying **110h** of project estimate and 0.77h of logged Proj time. The chart tops out around 44h because every Proj hour is dropped before it reaches the chart.

Two places drop it, both in the shared trend data layer:

1. `src/features/_shared/estimate-trend/fetchTrendData.ts` selects only `original_fe_estimate` and `original_be_estimate` from tickets — `original_project_estimate` is never fetched. It also filters time logs with `.in("discipline", ["FE", "BE"])`, so Proj time never counts as Actual.
2. `buildTrendSeries.ts` and `buildEpicSnapshots.ts` both compute Original as `original_fe_estimate + original_be_estimate`.

This shared layer feeds the Health page "Estimate Evolution by Epic", the "Trend over time" chart, the per-epic mini charts, and the client portal — so the omission shows up everywhere consistently.

## The fix

**Fetch layer** (`fetchTrendData.ts`)
- Add `original_project_estimate` to the ticket select and map it onto a new `original_project_estimate` field.
- Drop the `discipline` filter on `time_logs` so Proj logs are included in Actual.

**Types** (`estimate-trend/types.ts`)
- Add `original_project_estimate: number` to `TicketLite`.

**Builders**
- `buildTrendSeries.ts`: Original sums FE + BE + Proj.
- `buildEpicSnapshots.ts`: same change to the per-epic Original sum.

Estimate-change deltas already flow through `ticket_estimate_changes`, which records a `Project` discipline, so Current picks up Proj revisions automatically once Original includes the baseline.

## Effect on Prism 2

Original/Current rise from ~44h to ~154h, and Actual includes the 0.77h of logged Proj time. Epic rows in Estimate Evolution that contain only Proj tickets — currently filtered out because all three totals were zero — will start appearing.

## Note

This is a shared module: the same correction applies to the client portal's trend chart and the Health page at once, which is the intended behaviour (Proj work is real billable scope). No database changes are needed.
