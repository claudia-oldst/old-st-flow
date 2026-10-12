# Client Portal: Billing tab

## What you'll see
A new **Billing** tab in the client portal (public link and the PM/BA editor preview), placed between Summary and Change Requests.

Table, one row per epic (only epics with in-scope tickets):

| Epic | Original (Std/Proj) | Change Requests | Bugs | Total Original | Latest Revised | [Month columns...] | Actual Total |

- All values in hours (e.g. `12.5h`).
- Original (Std/Proj): original estimates of Standard + Proj tickets.
- Change Requests: original estimates of approved CR tickets.
- Bugs: original estimates of Bug tickets.
- Total Original: sum of the three.
- Latest Revised: current estimates across all tickets in the epic.
- Month columns: actual hours logged per month (UK time), from project start date to the portal cutoff.
- Actual Total: all logged hours for the epic across the whole project, regardless of which months are shown.
- Original (Std/Proj), Change Requests and Bugs are collapsed by default: only Total Original shows, with an expand chevron in its header that reveals the three breakdown columns (and collapses them again).
- Footer rows: **Total (hours)** and **Total (GBP)** at the project rate; GBP row hidden when rate is 0.
- Month filter (multi-select): defaults to the latest 5 months up to cutoff; clients can add or remove months.
- Respects the selected portal versions and cutoff, same as the other tabs.

## No duplicated data
- No new tables or columns. Everything is read live from existing tickets, estimates, time logs, epics and project settings.
- Hour figures are computed on the fly; GBP uses the existing project rate.

## Technical details
- Two read-only database functions (no schema changes):
  - `get_client_portal_billing(_hash)` for the public link, resolving project, cutoff and versions from the existing `projects` fields.
  - `get_project_portal_billing(_project_id, _cutoff, _versions)` for the PMBA preview, PMBA/member-guarded.
  - Both return per-epic estimate sums from `tickets` (original_* / current_* fields, CR only when approved) and per-epic per-month `time_logs` sums (month bucketed in Europe/London, logged_at <= cutoff).
  - Version filter mirrors existing portal RPCs (`[]` = all versions).
- Frontend: `src/features/client-portal/billing/` with `usePortalBilling.ts` (hash or preview), `BillingTable.tsx` (sticky epic column, horizontal scroll), `BillingMonthFilter.tsx` reusing `MultiSelectFilter`, `buildBilling.ts` pure helpers + unit tests (default 5 months, totals, GBP).
- Wire tab into `ClientPortalPublic.tsx` and `ClientPortalEditor.tsx`; add `docs/pages/portal-billing.md`.
