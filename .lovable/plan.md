The CR approval (6 May 14:37) doesn't show on the chart because both trend builders sample daily starting from `startOfDay`. With `asOf = today`, the loop's last sample is 6 May 00:00 — before the CR's approval timestamp — so the +220h Original jump never appears. The per-epic snapshot bars use `endOfDay(asOf)` so they are correct; only the line chart is missing the final point.

## Fix

Append a final bucket pinned to `end` (= `endOfDay(asOf)`) in both trend builders so any same-day event (CR approval, estimate change, time log) is reflected in the last sample on the chart.

### `src/features/health/EstimateEvolution.tsx` (trendData)
- Extract bucket sampling into a `sampleAt(cutoff)` helper.
- After the daily loop, if the last bucket's timestamp is `< end`, push one more bucket sampled at `end` with label `format(end, "d MMM")`.

### `src/features/client-portal/PortalEpicTrend.tsx` (buildSeries)
- Same change: extract sampling, then ensure a final bucket at `end` (= `endOfDay(cutoff)`).

No other logic changes; CR effective-date handling stays as already implemented.

## Verification
- Health chart shows +220h Original step and Current settling at +80h on 6 May for COU-441.
- Client portal `Estimate trend over time` chart shows the same step on the approval date.
- Pending/rejected CRs still excluded; standard tickets unaffected.