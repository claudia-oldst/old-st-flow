# Align client health and portal dates to 00:00 – 23:59

## What I found

- On the client portal editor, choosing an "As of" date stores that date at **00:00**, so anything logged during the chosen day is left out of the client snapshot. It should include the whole day up to 23:59.
- The health tab's "As of" date behaves correctly for the trend chart and epic snapshots (they already stretch to end of day), but the epic scope-change list in the portal editor uses the raw 00:00 value, so changes made on the as-of day are dropped.
- The Month-to-date card counts from the start of the month, but that start is calculated in UTC rather than in a business timezone, so hours logged in the first hours of the 1st can fall outside the card.
- The health epic snapshot counts a discount by the date it was captured, while the portal counts it by the date it was set to apply from. The two views can therefore disagree.
- Time logs are stored as exact moments, so a log made at 09:00 in one country and one made at 09:00 in another are correctly kept as different moments. Each person's date and time pickers already work in their own local time, so a log entered as "9 Sep, 09:00" is recorded as 09:00 where they are.

## Changes

1. When an As-of date is picked (client portal editor and health tab), treat it as the end of that day (23:59:59.999) before it is saved or used for filtering. Today's date keeps behaving as "everything so far".
2. Use that same end-of-day value for the portal editor's epic scope-change list, so it matches the rest of the snapshot.
3. Make the Month-to-date window start at 00:00 UK time on the 1st of the month, and end at the as-of moment.
4. Make the health epic snapshot use a discount's "applies from" date, matching the portal and the client report.
5. Keep every log at the exact moment it was made, and show each log internally with the date and time the person entered it, so a 09:00 log in Manila shows as 09:00 on that day, not shifted for a viewer elsewhere.
6. Anything the client sees — the portal, the client report and the project export — uses UK time for its day boundaries: from 00:00 UK on the From date through 23:59 UK on the As-of date, with dates and times printed in UK time.

## Technical notes

- `src/features/client-portal/editor/PortalToolbar.tsx`: the calendar `onSelect` value becomes 23:59:59.999 UK time for the chosen day before `setAsOf`.
- `src/features/health/EstimateEvolution.tsx`: same normalisation on its calendar `onSelect`.
- `src/features/client-portal/editor/useClientPortalEditor.ts`: `cutoffMs` from the normalised as-of; stored `client_visibility_cutoff` then carries the UK end-of-day instant.
- Migration updating `get_project_portal_preview` and `get_client_portal`: compute `m_start` as `date_trunc('month', cutoff AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'`; log/discount comparisons against `cutoff` stay unchanged.
- `src/features/project/export/runExportProject.ts`: the date window already filters on `logged_at` (the work date the log was made for), and that stays the case; `created_at` is kept only as a displayed column. Replace the local `startOfDay`/`endOfDay` with UK-zoned boundaries and format all exported dates/timestamps in `Europe/London` (use `date-fns-tz`, adding the dependency).
- Add a small shared helper (e.g. `src/lib/reportingTz.ts`) exposing `REPORTING_TZ = "Europe/London"`, `startOfDayInTz`, `endOfDayInTz`, `formatInTz`, used by portal, report and export so they cannot drift.
- `src/features/health/estimate-evolution/buildEpicSnapshots.ts`: discount filter uses `applied_at ?? created_at`.
- Internal logging: `time_logs.logged_at` is `timestamptz` and pickers build the instant from the logger's local date/time (`combineDateAndTime`), so writes are unchanged. Add `logged_tz_offset` (integer minutes) to `time_logs`, captured on insert, and render My Timelogs / logoff / ticket log lists using that offset so the entered day and time are preserved for other viewers.
- Add unit coverage for: a log on the as-of day, a discount applied on the as-of day, an export window across a BST/GMT change, and a log made just after midnight in another timezone.
