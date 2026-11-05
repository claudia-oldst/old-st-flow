## Show every ticket on the Tickets tab

The Migration project (COU) has 1,185 tickets, but the Tickets tab stops at 900. Board view, grouped list and filter counts stop there too. The list view also stops at 900 per page.

### What changes
- The Tickets tab loads every ticket for a project, whatever the project size. That covers board, list, grouped list and filter counts.
- Ungrouped list view still pages, but shows all tickets: page 2 picks up where page 1 ends.

### Technical details
- `src/lib/pagination.ts`: keep `ticketsList` at 900 per page (the database limit per request is 1,000).
- `useProjectTickets.fetchProjectTickets`: replace the single 900-row call with a loop. It calls `list_project_tickets` in pages of 1,000 (`_page` 1, 2, …) until it has `total` rows, then joins them. The 12s timeout applies to each page.
- No database changes. The RPC already caps each call at 1,000 rows, and the loop stays inside that cap.
- Add a vitest checking that a 1,185-ticket mock returns all 1,185 rows across two calls.
