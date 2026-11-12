# Bigger parent-ticket picker with hover preview

The parent picker shows up in three places: when adding tickets (this is also the Convert window), in the related tickets card on a ticket, and in quick add. All three use the same picker, so one change updates all of them.

## What changes
1. **Wider list:** the dropdown grows to about 720px wide, or as wide as the screen allows, instead of matching the button width. It also gets taller, with room for about 10 results.
2. **More detail on each row:** each row shows the ticket ID, the full title on up to two lines, a type pill (Standard/CR), the epic name and the status pill.
3. **Hover preview:** pointing at a row, or moving to it with the arrow keys, opens a side panel next to the list. The panel shows:
   - ID, title, type, epic, status and version
   - Current FE, BE and project estimates against the hours logged
   - The start of the acceptance criteria, about 12 lines
   - How many child tickets it already has
4. Search also matches the epic name, not just the ID and title.

## Technical details
- Only `ParentTicketSelect.tsx` changes. It sits under the 250-line limit by moving the row and preview into small `ParentOptionRow.tsx` and `ParentTicketPreview.tsx` files next to it.
- The list query adds ticket_type, status_id, epic_id and version. Epic names come from project_epics and statuses from the existing useStatuses.
- Acceptance criteria and child count load only when you hover, for one ticket at a time, and are cached by ticket ID. This follows the rule that ticket lists never download acceptance criteria.
- The preview opens beside the list on wide screens and below it on narrow ones.
- No database changes.
