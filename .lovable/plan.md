# Keep your place in the ticket list after editing a ticket

## What's happening
When you change a status in the side panel, the app reloads the project's tickets in the background. It downloads them 200 at a time, and each batch replaces the whole list on screen. For a moment the list holds only the first 200 tickets, so the page shrinks and you lose your scroll position.

## Fix (screens only, no database change)
1. **Background refreshes keep the full list visible.** While a refresh downloads, the current list stays on screen. The new list swaps in once, after every batch has arrived. Batch-by-batch loading stays for the first load only, when nothing is on screen yet.
2. **Your own edits show straight away.** A status change from the side panel updates that ticket in the list immediately, so you see it without waiting for the refresh.
3. **The side panel stays open** and the list keeps its scroll position.

## Technical details
- `useProjectTickets.ts`: call `onProgress` → `setQueryData` only when the cache has no complete data (`complete !== true`). Refetches resolve with the final result only.
- Status update in the drawer: optimistic `setQueryData` patching the single ticket in `["projectTickets", projectId]`.
- Extend `ticketLoadingHooks.test.tsx`: a refetch with existing complete data never exposes a partial list.
- Update the AGENTS.md progressive-loading rule to say partial pages apply to the first load only.
