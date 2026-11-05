# Blank dev status until a ticket is assigned

## What exists today
- The database already clears FE/BE dev status when the last assignee of that side is removed, and sets it to To Do when the first one is added.
- But other paths still write "To Do" on unassigned sides: CSV import (and feedback import) sends `todo` for every row, and bulk "set dev status" can set a status with nobody assigned. Today 798 tickets have an FE status and 640 a BE status with nobody assigned on that side.
- The app also displays a missing status as "To Do", so a blank never shows.

## Changes
1. **Database guard** — a trigger on tickets: if a side (FE/BE) has no assignee, its dev status is kept blank on insert and update. Project-type tickets are unaffected. The existing assign/unassign trigger keeps doing the "first assignee sets To Do" step.
2. **One-off cleanup** — blank the dev status on every ticket side that currently has nobody assigned (the 798 FE / 640 BE above). Project status is recalculated as today (blank counts as To Do for the status rules, so project statuses won't move).
3. **CSV / feedback import** — stop sending `todo` for unassigned sides; send the CSV status only where an assignee is given.
4. **Display** — ticket detail, lists, board and bulk actions show a blank "—" chip for an unassigned side instead of To Do; the dev status picker is disabled until someone is assigned on that side (hint: "Assign someone first").
5. **Bulk assign** — keep its reset-to-To-Do only for sides that end up assigned.

## Tests
- Small vitest for the display rule (no assignee shows blank; assignee shows the stored status).
- DB check after migration: zero unassigned sides with a status; assigning someone sets To Do; removing them blanks it.

## Technical notes
- New BEFORE INSERT/UPDATE trigger `enforce_blank_unassigned_status` on `public.tickets` (skips `ticket_type = 'Proj'`); on INSERT assignees don't exist yet, so both sides go blank and the assignee trigger fills To Do.
- Remove `?? "todo"` coercion in `fetchTicketDetail.ts`, `useProjectTickets*`; `DisciplineStatus | null` in types where needed.
- Board/sprint discipline columns: unassigned sides aren't shown as cards (unchanged behaviour for cards with assignees).
