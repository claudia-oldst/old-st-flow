Fix CR handling in both estimate trend charts.

## Health page — `src/features/health/EstimateEvolution.tsx`

Currently treats every ticket the same: original on `created_at`, current = original + approved deltas. Approved CRs aren't reflected correctly.

Changes:
1. Query `ticket_type, cr_approval, cr_decided_at` alongside existing fields (via `useProjectTickets` it's already exposed for cr_approval/cr_decided_at; ticket_type is too).
2. In trend + per-epic snapshot:
   - Skip CRs that aren't `approved` (pending/rejected don't appear).
   - Standard tickets: contribute `original_fe + original_be` to Original starting at `created_at` (unchanged).
   - Approved CR tickets: contribute `original_fe + original_be` to Original starting at `cr_decided_at` (fallback `created_at`). This makes a 220h CR show as +220h Original on its approval date.
   - Current line: original + sum of approved estimate-change deltas (ticket_estimate_changes), with deltas counted from their `created_at`. Since the CR's pre-approval trim from 220h → 80h is recorded as a `ticket_estimate_changes` delta (-140h), Current ends up at 80h post-approval. No special CR math needed.
3. Per-epic snapshot rows above the chart use the same rules so bars match the chart.

## Client portal — `src/features/client-portal/PortalEpicTrend.tsx`

Already special-cases CRs but uses the CR's `original` for the Original line and sets Current = `original + deltas`. That's structurally fine, BUT it currently double-counts: the pre-approval trim recorded in `ticket_estimate_changes` is added on top of `cr_fe/cr_be`, so Current is wrong.

Changes:
1. Keep CR Original contribution = `original_fe + original_be` from `cr_decided_at`.
2. For Current line on CRs: do NOT also apply `ticket_estimate_changes` deltas dated before `cr_decided_at` — only deltas after approval should adjust Current. Simplest implementation: ignore all `ticket_estimate_changes` rows for CR tickets whose `created_at <= cr_decided_at`.
3. Pending/rejected CRs continue to be excluded.
4. Verify: 220h CR `COU-441` shows +220h Original and +80h Current on/after 6 May 2026; standard tickets unaffected.

## Verification

- Health and Client Portal `Estimate trend over time` charts both show:
  - +220h Original step on the CR approval date.
  - +80h Current step on the CR approval date.
  - Pending/rejected CRs don't appear.
  - Non-CR tickets unchanged.