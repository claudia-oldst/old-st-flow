# Fix the 150% cap on Epic estimate burn

## What's wrong

In the Project Health "Epic risk — doneness vs estimate burn" table, the burn percentage itself is clamped to 150 before it is displayed (`Math.min(150, actual / baseline * 100)`). So every epic that has burned more than 1.5x its baseline reads exactly "150% burned", regardless of whether the real figure is 160% or 900%. That's what the screenshot shows.

The same clamp also feeds the risk classification and the row sort, so heavily over-burnt epics are indistinguishable from mildly over-burnt ones.

## The fix

- Compute the true burn percentage with no cap and use that value for the label, the risk calculation, and the sort order.
- Keep the visual bar clamped at 100% width (a bar can't overflow its track) — it already does this, and it stays coloured red past 100%.
- When an epic has no baseline estimate but has logged hours, show that honestly (e.g. "no estimate · 12h logged") instead of a fake 150%, and keep treating it as at risk.

## Technical detail

Single file: `src/features/health/overview/EpicRiskTable.tsx`.

- Replace the `burnPct` computation so it is `(actualHours / baselineEst) * 100` uncapped, with `null` (or 0 plus a `hasBaseline` flag) when `baselineEst === 0`.
- `computeRisk` already special-cases `baselineEst === 0`; it keeps working on the uncapped value.
- Bar width stays `Math.min(100, burnPct)`; the label prints the uncapped rounded value.
- Sorting by `burnPct` descending now orders correctly.

No database, RLS, or layout changes.
