# Epic before parent in the create ticket window

## What changes
- Field order in each new-ticket row becomes: **Type → Epic → Parent ticket**.
- The Epic picker always shows (it no longer disappears once a parent is picked).
- Once an epic is chosen, the parent list only shows tickets in that epic. With no epic chosen, the parent list shows all tickets as today.
- Picking a parent first still works: the epic fills in from the parent automatically.
- Changing the epic to a different one clears a parent that no longer belongs to it.
- Proj tickets still have no parent field. Applies everywhere this window is used (new tickets, child tickets, converting feedback).

## Technical details
- `DraftRow.tsx`: move the EpicSelect block above ParentTicketSelect, drop the hide-when-parent condition, clear `parentTicketId/parentTitle` on epic change when the parent's epic differs.
- `ParentTicketSelect.tsx`: add optional `epicId` prop; filter options by `epic_id` client-side (already loaded). Other callers unaffected.
- No database changes.
