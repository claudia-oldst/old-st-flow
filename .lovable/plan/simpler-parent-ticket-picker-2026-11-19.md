# Simpler parent ticket picker

## What changes
- The picker becomes a plain, compact list: one line per ticket showing **ticket number and title** only. Type, epic and status move out of the rows.
- The search box always stays visible at the top, and the list is shorter so it no longer runs off the screen.
- The large preview panel beside the list goes away. When you hover over a ticket, a small card pops out next to it with its type, epic, status, estimates and a short description.
- Clicking a ticket selects it and closes the picker, as it does now. The epic filter from the last change still applies.
- This works everywhere the picker is used: creating tickets, child tickets, converting feedback, and Related tickets.

## Technical details
- `ParentOptionRow.tsx`: a single-line row (mono ID plus a truncated title, with a check mark when selected).
- `ParentTicketSelect.tsx`: remove the split side panel. The popover is about 440px wide, uses `side="bottom"` with collision padding, and the list is capped at about 320px high. Wrap each item in a `HoverCard` (`side="right"`, short open delay) that renders the existing `ParentTicketPreview`, so the preview only loads on hover.
- No database changes.
