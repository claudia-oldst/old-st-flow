## Show epic next to ticket ID on kanban cards

In `src/features/tickets/TicketCard.tsx` (header row, around line 161), append the epic name in brackets next to the formatted ticket ID when the ticket has an epic.

Example: `COU-027 [Onboarding]`

### Details
- Use `ticket.epic_name` (already loaded by `useProjectTickets`).
- Render inside the same `font-mono text-[10px] text-dimmer` span (or as a sibling span with matching styling) so it stays visually attached to the ID.
- Truncate gracefully if long (e.g. `max-w-[120px] truncate inline-block`) to avoid breaking the card layout.
- Only render the bracketed portion when `ticket.epic_name` is non-null — no empty `[]`.
- No changes to data fetching, list view, or other components.
