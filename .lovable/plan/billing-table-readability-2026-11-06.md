# Billing table readability

Only the billing table's look changes; no data or logic changes. Uses existing tokens (surface-2, primary, brand-gold, hairline borders) and the existing table.

## Changes
1. **Header row** — solid darker background (surface-2), sticky to the top when scrolling, brighter header text, thicker bottom border so it clearly separates from data.
2. **Column groups** — a thin divider line and faint tint to separate three blocks:
   - Estimates (Original breakdown, Total Original, Latest Revised)
   - Months
   - Totals (Actual Total, Discount/Unbilled, Grand Total) — slightly stronger tint; Grand Total bold.
3. **Epic name column** — sticky left column gets a solid background and a right border so it stands apart when scrolling sideways; epic names in medium weight.
4. **Epic rows** — alternating row shading (zebra) and a clearer hover highlight.
5. **Totals block** — Total / Discount / Grand Total rows get a shaded background with a heavier top border; Grand Total rows bold, GBP rows in coral as today; Discount values shown dimmer.
6. **Zero values** — show a dim "–" instead of 0.0 so real numbers stand out.

## Technical
- Edit only `src/features/client-portal/billing/BillingTable.tsx` (class names, a `group` field on columns for dividers, zero formatting). Applies to client portal and editor preview.
