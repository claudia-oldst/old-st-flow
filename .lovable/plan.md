# Align client health and portal dates to 00:00 – 23:59

## What I found

- On the client portal editor, choosing an "As of" date stores that date at **00:00**, so anything logged during the chosen day is left out of the client snapshot. It should include the whole day up to 23:59.
- The health tab's "As of" date behaves correctly for the trend chart and epic snapshots (they already stretch to end of day), but the epic scope-change list in the portal editor uses the raw 00:00 value, so changes made on the as-of day are dropped.
- The Month-to-date card counts from the start of the month, but that start is calculated in UTC rather than local time, so the first two hours of the 1st of the month can fall outside the card.
- The health epic snapshot counts a discount by the date it was captured, while the portal counts it by the date it was set to apply from. The two views can therefore disagree.

## Changes

1. When an As-of date is picked (client portal editor and health tab), treat it as the end of that day (23:59:59.999) before it is saved or used for filtering. Today's date keeps behaving as "everything so far".
2. Use that same end-of-day value for the portal editor's epic scope-change list, so it matches the rest of the snapshot.
3. Make the Month-to-date window start at 00:00 local time on the 1st of the month containing the as-of date, and end at the as-of moment.
4. Make the health epic snapshot use a discount's "applies from" date, matching the portal and the client report.

## Technical notes

- `src/features/client-portal/editor/PortalToolbar.tsx`: wrap the calendar `onSelect` value in `endOfDay` before `setAsOf`.
- `src/features/health/EstimateEvolution.tsx`: same normalisation on its calendar `onSelect`.
- `src/features/client-portal/editor/useClientPortalEditor.ts`: `cutoffMs` from the normalised as-of; stored `client_visibility_cutoff` then carries 23:59:59.999.
- Migration updating `get_project_portal_preview` and `get_client_portal`: compute `m_start` as `date_trunc('month', cutoff AT TIME ZONE 'Africa/Johannesburg') AT TIME ZONE 'Africa/Johannesburg'`; log/discount comparisons against `cutoff` stay unchanged.
- `src/features/health/estimate-evolution/buildEpicSnapshots.ts`: discount filter uses `applied_at ?? created_at`.
- Add unit coverage in the existing trend/snapshot tests for a log recorded on the as-of day and a discount applied on the as-of day.
