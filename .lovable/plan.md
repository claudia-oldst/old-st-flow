# Show all epics in Epic Risk table, even with 0h estimate

## Change

In `src/features/health/overview/EpicRiskTable.tsx`, relax the filter that hides epics whose current estimate is 0.

Currently (line ~72):
```ts
if (total === 0 || currentEst === 0) continue;
```

Change to:
```ts
if (total === 0) continue; // still skip epics with no categorized tickets
```

## Handling divide-by-zero for burn %

`burnPct` is computed as `(actualHours / currentEst) * 100`. When `currentEst === 0`:
- If `actualHours === 0` → show `0%` burned, healthy.
- If `actualHours > 0` → treat as fully over-burned: clamp to `150%` (the existing cap) and let risk logic flag it.

Implementation: guard the division — `burnPct = currentEst === 0 ? (actualHours > 0 ? 150 : 0) : Math.min(150, (actualHours / currentEst) * 100)`.

The estimate-burn bar and label already handle high burnPct (red bar, "X% burned · Yh / 0h"), so no display changes needed.

## Risk classification

`computeRisk` already early-returns `"healthy"` when `currentEst === 0`. For epics with actuals-but-no-estimate that feels wrong — they should surface as risky. Update the guard so that when `currentEst === 0 && actualHours > 0`, risk is `"at_risk"`; when both are 0, stay `"healthy"`.

## Out of scope

- The CR filter (unapproved CRs still excluded) — unchanged.
- Unknown-status tickets still excluded from `total` — unchanged.
- No changes to the Overview burn ring or weekly burn panel.

## Files

- `src/features/health/overview/EpicRiskTable.tsx` (single file, ~5 lines changed)
