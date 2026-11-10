# Show Related tickets on Feedback tickets

On Feedback tickets, the Details tab currently hides the Related tickets card along with Time logs.

## Change
- In the ticket Details tab, always show the **Related tickets** card (parent picker + "Add child ticket…"), including on Feedback tickets.
- Keep **Time logs** hidden on Feedback tickets, as it is today.

## Technical details
- `src/features/tickets/detail/TicketDetailBody.tsx`: move `<RelatedTickets />` out of the `!isFeedback` block; leave `<TimeLogsPanel />` inside it.
