# Keep your place in the ticket list after editing a ticket

## What's happening
When any ticket changes, whether you edit it or a colleague does, the app downloads the project's whole ticket list again, 200 at a time. Each batch replaces the list on screen. For a moment only the first 200 tickets are there, so the page shrinks and you lose your place.

## Fix: update only the ticket that changed (screens only, no database change)
1. **The list stays loaded.** When a live update comes in for a ticket, the app re-fetches only that ticket's row and swaps it into the list where it already sits. The rest of the list and your scroll position stay as they are.
2. **Your own edits show straight away.** A status change from the side panel updates that row immediately, then the live update confirms it.
3. **New or deleted tickets** get added to or removed from the list one at a time.
4. **Full reload as a safety net.** Rare bulk changes, such as editing epics or a burst of more than about 50 ticket changes at once, still trigger a reload. That reload keeps the old list on screen until the new one has fully downloaded, so it never shrinks.
5. **The side panel stays open.**

## Technical details
- `useTicketListRealtime.ts`: read ids from the realtime payloads (`tickets.id`, `ticket_assignees.ticket_id`) and collect them over a short debounce. Fetch those rows through the existing list RPC shape (filtered by id) so joined fields like assignees and hours match. Then `setQueryData` patches, inserts or removes them in `["projectTickets", projectId]`. `project_epics` changes and large bursts fall back to invalidation.
- `useProjectTickets.ts`: apply `onProgress` partial pages only when the cache has no complete data yet. Refetches resolve with the final result only.
- Optimistic patch for status changes made in the side panel.
- Tests in `ticketLoadingHooks.test.tsx`: a single-ticket change patches one row without refetching everything, and a fallback reload never exposes a partial list.
- Update the AGENTS.md realtime/progressive-loading rule.
- If the list RPC can't filter by id without a database change, I'll stop and ask you before touching anything.
