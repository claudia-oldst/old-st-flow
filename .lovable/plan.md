# AI search in the parent ticket picker

## What changes
- The parent picker's search box gets the same sparkles button as the ticket search bars.
- It works the same way: off by default, click the sparkles, describe the ticket (for example "payment options page"), then press Enter. It turns itself off after each search.
- It only looks at tickets the picker already offers, so an epic you've picked limits the search to that epic's tickets.
- While AI results are showing, the list shows only the matches, with a small "AI: N tickets ✕" chip to clear them. Typing in the box goes back to normal search.
- You can still hover for details and click to select.

## Technical details
- `ParentTicketSelect.tsx`: use the existing `useAiTicketSearch`. Control the `CommandInput` value. Add a sparkles button and a result chip above the list. Candidates are the epic-filtered options mapped to `{id, formatted_id, title, epic_name, ticket_type}`. When a result exists, filter the options by `result.ids` and turn off the cmdk text filter. Clear the result when the epic changes or the picker closes.
- Reuses the deployed `ai-ticket-search` function unchanged. No database changes.
