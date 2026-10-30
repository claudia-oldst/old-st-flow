# Thalamus filter on the Tickets tab

## What you'll see
- The existing **Filter** button on the Tickets tab gets a new **Source** section with one option: **Thalamus**.
- Ticking it shows only tickets that arrived from Thalamus as feedback and were later converted (they keep their Thalamus reference).
- It combines with the other filters, search and group by, and shows in the active-filter count like the others.
- Unconverted feedback stays in the Feedback tab only.

## Technical details
- Add a `source` filter section to `ProjectTicketsToolbar` filter sections (Tickets tab only).
- Pass `_filters.source = 'thalamus'` through `useProjectTicketsPaged` to `list_project_tickets`.
- Migration: update `list_project_tickets` to add `AND (_filters->>'source' IS NULL OR t.external_source = _filters->>'source')`; existing Feedback exclusion is unchanged. No new columns.
- Small test for filter param mapping.
