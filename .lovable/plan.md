## Goal
In the Epic Risk — Doneness vs Estimate Burn table, the "Estimate burn" column should measure actual hours against the **original** estimate, showing the current estimate in brackets for context.

## Change (single file: `src/features/health/overview/EpicRiskTable.tsx`)

1. Sum `original_fe_estimate + original_be_estimate + original_project_estimate` per epic (null-safe, treating nulls as 0) into a new `originalEst` alongside the existing `currentEst`.
2. Compute `burnPct` from `actualHours / originalEst` instead of `currentEst`. If `originalEst` is 0, fall back to `currentEst` as the baseline; if both are 0 and hours exist, keep the existing 150% over-burn treatment.
3. Update the caption line to:

```text
84% burned · 5.3h / 6.3h (current 8h)
```
i.e. `{pct}% burned · {actual} / {original} (current {currentEst})`. The bracketed part is omitted when the current estimate equals the original.
4. Bar colour thresholds (good/warn/bad) stay as-is but now reflect the original-based percentage.
5. Risk scoring (`computeRisk`) uses the same new `burnPct`, so epics that grew past their original baseline surface as watch/at-risk.

## Notes
Presentation/derivation change only — no database or schema work.
