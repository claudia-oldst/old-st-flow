
## Goal

Allow PMBAs to record one or more **epic-level discounts** (per discipline: FE / BE / Project) that reduce **billable / effective** hours without touching estimates or actuals. The discount flows through to:
- Health rings (arcs use effective ratio; new "Discounted" stat line; `Effective Actual = Actual − Discounted`)
- Estimate evolution chart (current + actual lines reflect discount)
- Estimate Revisions and CR views (totals reflect discounted hours)
- Client portal (totals + cost calculations reflect discounts)

## Database (new migration)

New table `public.epic_discounts`:
- `id uuid pk default gen_random_uuid()`
- `project_id uuid not null`
- `epic_id bigint not null`
- `discipline assignee_slot not null` (`FE` | `BE` | `Project`)
- `hours numeric not null check (hours > 0)`
- `reason text not null`
- `created_by uuid` (team_members.id)
- `created_at`, `updated_at` (with trigger)

RLS: read = all; insert/update/delete = `is_pmba(auth.uid())`.

Validation trigger: ensures `epic.project_id = NEW.project_id`.

Update SQL functions `get_client_portal` and `get_project_portal_preview` to:
- Aggregate `epic_discounts` per epic and project-wide
- Subtract discount hours from `actual_*`, `current_*` totals
- Recompute `cost_actual` / `cost_estimate` on effective hours
- Return `discount_hours` per epic + `discount_total` in totals

## Hook + shared logic

`src/features/discounts/useEpicDiscounts.ts` — list + realtime invalidate; `createDiscounts(rows[])`, `updateDiscount`, `deleteDiscount`.

`src/features/discounts/applyDiscounts.ts`:
- `discountTotalsByDiscipline(discounts)` → `{ FE, BE, Project }`
- `discountTotalsByEpic(discounts)` → Map<epicId, totals>
- `discountsBefore(discounts, cutoffMs)` → time-filtered list (for evolution chart + portal cutoff)
- Used everywhere effective hours are needed.

## Create Discount dialog

`src/features/discounts/CreateDiscountsDialog.tsx`, modeled on `AddTicketsDialog` / `useDraftRows`:
- Add row / remove row controls
- Each row: Epic select, Discipline select (FE/BE/Project), Hours input, Reason input
- Bulk submit; toast on success; invalidates discounts + health + estimate-revisions + CR queries.
- Zod validation (epic, discipline, positive hours, non-empty reason).

## Surfacing

### Health page (`ProjectHealth.tsx`)
- PMBA-only **"Create discount"** button in section header.
- Aggregate discounts per discipline; pass to each `Ring` and `HealthSummaryRow`.
- Below rings: `DiscountsList` (epic, discipline, hours, reason, created_at). Edit/delete for PMBA.

### Ring (`overview/Ring.tsx`)
- New optional `discounted` prop.
- Effective actual = `max(0, actual − discounted)`.
- **Outer arc uses `effective / estimate`** (per your direction).
- Inner arc uses `effective / original`.
- Stat list adds a "Discounted" line (coral, `−Xh`) above Actual; shows "Effective" line right after.

### HealthSummaryRow
- Profitability % uses effective totals (cost = effective_hours × rate).

### Estimate evolution chart (`useEstimateEvolution.ts` + `EstimateTrendChart.tsx`)
- Load discounts (with `created_at` + epic + discipline).
- At each time bucket: subtract sum of discounts whose `created_at ≤ cutoff` from both `current` and `actual` series, filtered by `selectedEpic`.
- "Original" line untouched.

### Estimate Revisions (`ProjectChangeRequests.tsx` + `EpicChangeCard` / `Row` + `useEpicChange.ts`)
- `computeEpicTotals` (in `epic-change/useEpicChange.ts`) gains a `discounts` param; subtracts epic+discipline discount totals from `currentApproved`, `actual`, and `projected`.
- Card surfaces a "Discounted" line under each epic's totals.

### CR views (`ProjectChangeRequestTickets.tsx` + `EpicCRCard` / `useEpicCR.ts`)
- Same treatment: subtract matching epic discounts from displayed effective totals and projected impact.

### Client portal
- `ClientPortalEditor`: PMBA-only "Create discount" button in `PortalToolbar`.
- `PortalView`: shows "Discounts applied" line per epic + in totals (uses fields returned from updated RPCs).
- `PortalEpicTrend` / `usePortalEpicTrendData`: subtract discounts (respecting cutoff) from current + actual series.

## PMBA gating

- Dialog launchers and edit/delete controls hidden unless `isPMBA(role)`.
- Server-side enforced via RLS calling `is_pmba()`.

## Out of scope

- No retroactive recalculation of `cached_total_hours` / `cached_total_cost` on `projects`.
- No CSV import of discounts.
- No per-ticket discounts (epic-level only).

## Files touched

```text
supabase migration                                              NEW
src/features/discounts/useEpicDiscounts.ts                      NEW
src/features/discounts/applyDiscounts.ts                        NEW
src/features/discounts/CreateDiscountsDialog.tsx                NEW
src/features/discounts/DiscountsList.tsx                        NEW
src/features/health/ProjectHealth.tsx                           edit
src/features/health/overview/Ring.tsx                           edit
src/features/health/overview/useProjectHealth.ts                edit
src/features/health/overview/HealthSummaryRow.tsx               edit
src/features/health/estimate-evolution/useEstimateEvolution.ts  edit
src/features/estimates/epic-change/useEpicChange.ts             edit
src/features/estimates/EpicChangeCard.tsx                       edit
src/features/estimates/EpicChangeRow.tsx                        edit
src/features/change-requests/epic-cr/useEpicCR.ts               edit
src/features/change-requests/EpicCRCard.tsx                     edit
src/features/change-requests/EpicCRRow.tsx                      edit
src/features/client-portal/editor/PortalToolbar.tsx             edit
src/features/client-portal/PortalView.tsx                       edit
src/features/client-portal/epic-trend/usePortalEpicTrendData.ts edit
```
