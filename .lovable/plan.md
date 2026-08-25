# Month to Date card — client portal

Add a fourth tile to the client portal (both the PMBA editor preview and the public `/h/:hash` view) showing the hours billed in the calendar month of the portal's "as of" date, with cost.

## What the client sees

Month is derived from the portal cutoff date. Cutoff 31 July 2026 -> the card covers 1–31 July 2026 (up to the cutoff instant).

```text
┌──────────────────────────────┐
│ MONTH TO DATE      JULY 2026 │
│                              │
│ £4,275                       │
│ 45h billed                   │
│                              │
│ Frontend            22.0h    │
│ Backend             18.5h    │
│ Project              6.5h    │
│ Discounted          −2.0h    │
└──────────────────────────────┘
```

- Big white number = cost (hours after discount x rate per hour). If the project has no rate, the big number becomes the billed hours and the cost line is dropped.
- Four small rows: Frontend / Backend / Project actual hours for the month, and discounted hours for the month (shown negative, hidden when zero).
- Sits alongside the existing Tickets / Progress / Cost tiles in the same grid, styled with the same `Tile` treatment.

## Scope rules

- Only time logs with `logged_at` inside the month window and `<= cutoff`, on tickets already in the portal scope (same version filter and CR/approval rules as the rest of the payload).
- Discounted hours for the month: `epic_discounts` rows created inside the same month window (that is the only date the discount records carry).
- Cost only shown where the existing portal already shows rate (`showRate`).

## Technical notes

- Extend both security-definer RPCs `get_project_portal_preview` and `get_client_portal` with a `month` block in the returned JSON: `{ start, end, fe_actual, be_actual, proj_actual, discount_hours, billed_hours, cost }`, computed with a month-windowed variant of the existing `ticket_hours` CTE joined to the same in-scope ticket set.
- Add a `PortalMonth` interface to `src/features/client-portal/types.ts` and an optional `month` field on `PortalPayload` (optional so old cached payloads still render).
- Render a new `MonthToDateTile` inside `PortalView.tsx`, in the existing tiles grid, guarded on `payload.month` being present.
- No changes to totals, epic tables, timeline or discount application logic.
