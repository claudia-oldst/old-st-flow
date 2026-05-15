## Goal

Make the client portal preview (PMBA editor) and the public `/h/:hash` view reflect epic-level discounts in the existing tiles, cards, numbers, and trend chart — without adding a new "Discounts" section.

## What changes (display only)

Discounts continue to live in `epic_discounts`. We apply them at render time on the client, mirroring the convention used in Health/CR/Estimate views:

```text
Effective Actual = max(0, Actual − Discounted)
Cost Actual      = Effective Actual × rate
Estimate         = unchanged (raw current estimate)
```

Discipline ticket counts (FE/BE done/in-progress/to-do) are unchanged — discounts are hours-only, not ticket-status.

## Files

1. **`src/features/discounts/useEpicDiscounts.ts`** — already exists. Reuse its project-scoped fetch (works under the open RLS that's already in place, so it loads fine on the public `/h/:hash` page too).

2. **`src/features/client-portal/PortalView.tsx`**
   - Accept `discounts: EpicDiscount[]` as a new prop.
   - Cost tile: replace `totals.cost_actual` with `max(0, actual_total − totalDiscountedHours) × rate`. Keep label "Cost", keep the "of {cost_estimate}" subline unchanged.
   - "Estimate Change Detail" per-epic card: subtract that epic's discount total from `actual_hours` before multiplying by rate for the right-hand cost number.
   - No new section, no extra row.

3. **`src/features/client-portal/PortalEpicTrend.tsx`** + **`epic-trend/usePortalEpicTrendData.ts`**
   - Load discounts for the project (same hook).
   - In `buildEpicTrendSeries`, accept `discounts` and subtract the epic-scoped discount total whose `created_at <= sample timestamp` from the `actual` line. Floor at 0. Original/current lines untouched.

4. **`src/features/client-portal/usePortalData.ts`**
   - Add `epic_discounts` to the realtime invalidation list for both `usePortalPreview` and `usePublicPortal` so changes flow through immediately.

5. **`src/features/client-portal/ClientPortalEditor.tsx`** and **`src/pages/ClientPortalPublic.tsx`**
   - Fetch discounts via `useEpicDiscounts(projectId)` and pass them into `<PortalView discounts={...} />`. On the public page, `projectId` comes from `data.project.id` once loaded.

## Out of scope

- No SQL/RPC changes. The portal RPCs keep returning raw actuals; discount math stays purely on the client (consistent with how Health/CR already do it).
- No new "Discounts" section, list, or row in the portal UI.
- Discipline progress bars (ticket counts) stay as-is.
