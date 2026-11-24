# Live ticket updates without reloading the whole list

## What's happening now
- Any change to a ticket or its assignees, by you or a colleague, makes the app download the project's whole ticket list again, 200 at a time.
- Each batch replaces the list on screen, so for a moment only the first 200 tickets are there. The page shrinks and you lose your place.
- The live-update listener notices that something changed, but not which ticket. That's why it can only reload everything.
- Editing epics also forces a full reload.

## What will change
1. **Only the changed ticket updates.** A live update now says which ticket changed. The app fetches just that ticket's row and swaps it into the list where it already sits. Your scroll position and the open side panel stay as they are.
2. **Your own edits show instantly.** A status change in the side panel updates the row straight away, and the live update then confirms it.
3. **New tickets appear and deleted tickets disappear** one at a time, with no reload.
4. **Epic changes** such as a renamed epic or a new order update the epic details on the tickets already loaded, with no reload.
5. **Full reload only as a last resort,** for example after your connection drops and comes back. Even then the current list stays on screen until the new one has fully downloaded, so it never shrinks.

This applies to every page that uses the shared ticket list: Tickets, Feedback, Sprints Roadmap, Board, Change Requests and the client report.

## One small database change (needs your OK)
The ticket loader can't fetch specific tickets by ID yet. I'd add one optional "only these ticket IDs" filter to it.
- It's read-only: it doesn't change any data, tables or permissions.
- Feedback tickets are excluded exactly as they are today.
- It sends no Slack messages.
- Every existing caller works the same as before.

I'll show you the exact change and wait for your confirmation before applying it.

## Technical details
- `useRealtimeReload`: pass the collected payloads (`eventType`, `new`/`old` id fields) to `onChange`. Existing callers ignore the argument.
- `useTicketListRealtime` becomes a patcher:
  - Collect ids from `tickets.id` and `ticket_assignees.ticket_id` over about 300ms.
  - Fetch those rows through `list_project_tickets` with `_filters.ticketIds`.
  - `setQueryData` replaces or inserts each row, keeping its position, on `["projectTickets", id]` and the paged key.
  - A DELETE event, or an id that no longer comes back, removes that row.
  - `project_epics` events patch epic fields in place.
  - Bursts of more than about 100 ids, or a reconnect, fall back to a full refetch.
- `useProjectTickets`: apply partial pages only while the cache has no complete data. Refetches swap in the finished result once.
- Remove the epic-save `invalidateQueries` calls in `useProjectEpics.ts` in favour of the realtime patch.
- Side-panel status change: optimistic row patch.
- Migration: add `ticketIds` (uuid[]) to the `_filters` handling in `list_project_tickets`. The function signature and grants stay the same.
- Tests:
  - A single-ticket event patches one row with no full fetch.
  - An insert or delete adds or removes a row.
  - A fallback refetch never exposes a partial list.
- AGENTS.md: replace the progressive-loading/realtime rule with "realtime patches changed rows; full refetch is fallback only and never shows partial data".
