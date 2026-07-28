## Goal
The client portal's epic table currently shows only `Current / Original` hours. Add **Actual** as the first value, so each epic row reads **Act / Cur / Orig**.

## Changes

**1. `src/features/client-portal/PortalEpicTable.tsx`**
- Change the column header from `Hours (cur/orig)` to `Hours (act/cur/orig)`.
- Widen the hours column slightly in the shared grid template (header + row must stay identical), e.g. `minmax(0,0.9fr)` → `minmax(0,1.15fr)`.

**2. `src/features/client-portal/portal-epic/PortalEpicRow.tsx`**
- Render three values in the hours cell: `actual_hours` emphasised (normal text colour), then `/ current_estimate / original_estimate` in the dimmer style, all in the existing mono font.
- Same grid-template update as the header.
- No data fetching change needed — `actual_hours` is already part of the portal payload (`PortalEpic.actual_hours`) returned by the portal RPCs.

## Notes
- Values keep using the existing `formatHours` helper, so `24.1h`, `27h`, etc. stay consistent.
- Actual is shown as the raw logged hours from the payload (same figure already used in the expanded epic panel); epic discounts continue to be surfaced in the expanded panel rather than netted into this row.
- On narrow screens the three-number cell can wrap; it stays right-aligned and truncation is avoided by the wider column.
