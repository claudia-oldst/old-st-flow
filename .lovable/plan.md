# Client portal filter: Type, Epic, Version

## What the client sees
- One filter bar at the top of the client portal, shared by every tab (Overview, Timeline, Change Requests, Billing).
- Three dropdown filters, same look as the filters on the Tickets tab:
  - **Type**: All (default), Bugs, Change Requests, Project tickets (standard/story tickets). Single choice toggle.
  - **Epic**: multi-select of the project's epics (incl. "No Epic"); empty = all.
  - **Version**: multi-select, limited to the versions the PMBA published the portal for; empty = all of those.
- Defaults to All / all epics / all versions. A "Clear" link resets.
- Choices are kept in the link (`?type=&epic=&version=` next to `?tab=`), so a shared link opens with the same view.
- Tiles, epic table, trend chart, timeline, change requests and billing all recalculate for the filter.
- Same filter bar shows in the PMBA portal preview.

## Rules
- Clients can only narrow what the PMBA published — never widen the version scope.
- Feedback tickets stay excluded, as today.
- Discounts follow the epic filter; for the Type filter they are shown only under All (discounts are per epic, not per ticket type).

## Technical details
- Portal numbers are computed in the database RPCs (`get_client_portal`, `get_project_portal_preview`, `_gantt`, `_change_requests`, `_billing`, `get_project_portal_billing`). Add optional args `_types text[]`, `_epic_ids int[]`, `_filter_versions text[]` (empty = no filter) and apply them in each ticket/time-log CTE; filter versions intersected with the portal's published scope.
- New `src/features/client-portal/filters/` : `portalFilters.ts` (parse/serialize URL params, type→ticket_type mapping), `PortalFilterBar.tsx` built from `_shared/filters/MultiSelectFilter` + existing Select/ToggleGroup.
- Hooks (`usePortalData`, `usePortalGantt`, `useClientPortalCRs`, `usePortalBilling`) take the filter object and include it in query keys.
- `portalLink` keeps filter params alongside `tab`.
- Tests: `portalFilters.test.ts` (default is All, URL round-trip, type mapping, versions can't exceed published scope).
