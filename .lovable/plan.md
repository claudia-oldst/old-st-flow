## Goal
Let PMBA users change a ticket's **type** (Standard / Bug / CR / Proj) from the Ticket Detail sheet header, next to where the type chip currently renders.

## Change
In `src/features/tickets/detail/TicketDetailHeader.tsx`, replace the read-only type pill with a small inline `Select` (shadcn) when `canEdit` is true. On change, update `tickets.ticket_type` via Supabase and refresh the sheet.

- Options: Standard, Bug, CR, Proj (matches the enum used in `AddTicketsDialog`).
- Non-PMBA users keep seeing the current read-only pill.
- Switching **to Proj**: null out `current_fe_estimate` / `current_be_estimate` / `original_*` and any `parent_ticket_id` (Proj tickets can't have a parent — mirrors AddTickets behaviour). Move any existing FE/BE hours into `current_project_estimate` if project estimate is null, otherwise leave project estimate as-is.
- Switching **from Proj to a dev type**: null out `current_project_estimate` / `original_project_estimate`; leave FE/BE at 0 for the user to edit.
- Show a toast on success/failure and call the existing `onChange` refresh (thread it through from `TicketDetailSheet` where the header is rendered).

## Technical
- Add `onChangeType?: (type: TicketType) => Promise<void>` prop to `TicketDetailHeader`.
- Implement `handleChangeType` in `useTicketEditor.ts` alongside `handleSaveEdit` — one supabase update + `onChange()`.
- Wire it in `TicketDetailSheet.tsx` (passes `canEdit` already).
- No schema changes; no changes to the Add dialog.

## Out of scope
Bulk type edits, CR-approval side effects when converting to/from CR (still editable manually via existing CR flow).
