## Add Pending flag to unapproved CR tickets

Add a small amber "Pending" badge next to the formatted ID on any ticket where `ticket_type === "CR"` and `cr_approval === "pending"`, so devs can see at a glance that the change request hasn't been approved yet.

### Where it appears

1. **`src/features/tickets/TicketCard.tsx`** — header row, alongside the type icon and formatted ID. Visible on the board, ticket list, and anywhere the card is rendered.
2. **`src/features/tickets/TicketDetailSheet.tsx`** — header area near the ticket title/ID, so it's also visible in the detail view (pending verification of the file structure).
3. **`src/features/tickets/TicketsList.tsx`** — list-row variant if the row renders the formatted ID separately from the card.

### Visual

Small pill: `bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30`, uppercase 9–10px, "Pending". Same amber as the CR `GitPullRequest` icon already used in `TypeIcon`, keeping consistency.

### Not in scope

- Client portal CR views (separate component already shows pending state).
- Approved/rejected CRs — no badge.
- No DB changes; `cr_approval` already exists and is loaded by `useProjectTickets`.
