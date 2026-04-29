## Goal
When the board's "My tickets" toggle is active, always show hours bars on cards regardless of the user's Card display preference. In "All" view, the hide preference still applies.

## Changes

**`src/features/tickets/TicketCard.tsx`**
- Add optional `forceBars?: boolean` prop.
- Compute `barsOn = prefs.bars || forceBars` and use it in `showFEBar`, `showBEBar`, `showProjectBar`.

**`src/features/board/ProjectBoard.tsx`**
- Pass `filterMine` down through `Column` and `DisciplineColumn`, then through `DraggableCard` / `DraggableDisciplineCard`, into `<TicketCard forceBars={filterMine} />`.
- Also pass on the `<DragOverlay>`'s `TicketCard`.

No other files change. Persistence, the Card display menu, list view, and TicketDetailSheet are untouched.
