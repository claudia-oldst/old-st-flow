# Billing tab: Discount/Unbilled and Grand Total

Uses the discounts PMBAs already record per epic (hours, reason, applied date). No new tables or columns.

## What the client sees
**New columns (after Actual Total):**
- **Discount/Unbilled**: total discount hours for that epic across the whole project.
- **Grand Total**: Actual Total minus Discount/Unbilled.

**New rows (under Total, top and bottom):**
- **Discount/Unbilled**: discount hours per month (by the month the discount was applied), plus totals in the two new columns.
- **Grand Total**: monthly Total minus that month's discount.
- If a rate is set, a GBP version follows each (as Total (GBP) does today).

**How the period works:** each month column covers only that month, and only the months you've chosen are shown. The three right-hand columns (Actual Total, Discount/Unbilled, Grand Total) always cover the whole project, as Actual Total does now. Then Grand Total = Actual Total − Discount always adds up on the same row, whatever months are showing. The month columns won't add up to those totals when some months are hidden. That's already true of Actual Total today.

Estimate columns stay blank in these two rows, because discounts reduce billed time, not estimates. The No Epic row has no discounts, since every discount belongs to an epic. Applies to the client portal and the editor preview.

## Technical details
- Migration: update `get_client_portal_billing` and `get_project_portal_billing` to also return `discounts: [{epic_id, month, hours}]` from `epic_discounts` (grouped by epic and `applied_at` month, capped at the cutoff). Feedback exclusion and epic ordering stay unchanged.
- `buildBilling.ts`: `BillingRow` gains `discount` and `grand`; also add a `discountRow` with per-month hours; `totalRow` sums the new fields.
- `BillingTable.tsx`: two trailing columns; render Discount/Unbilled and Grand Total rows (hours + GBP) within the existing `totals` block.
- Tests in `buildBilling.test.ts`: epic discount totals, per-month discount row, grand total = actual - discount.
