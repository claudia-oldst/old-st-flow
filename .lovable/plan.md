# Blank dev status until a ticket is assigned

## What exists today
- The database already clears FE/BE dev status when the last assignee of that side is removed, and sets it to To Do when the first one is added.
- But other paths still write "To Do" on unassigned sides: CSV import (and feedback import) sends `todo` for every row, and bulk "set dev status" can set a status with nobody assigned. Today 798 tickets have an FE status and 640 a BE status with nobody assigned on that side.
- The app also displays a missing status as "To Do", so a blank never shows.

## Changes
1. **Database guard** — a trigger on tickets: if a side (FE/BE) has no assignee, its dev status is blank when the ticket is created (new tickets only, so existing tickets are not rewritten when edited). Project-type tickets are unaffected. The existing assign/unassign trigger keeps doing the "first assignee sets To Do" step.
2. **Existing tickets left untouched** — no cleanup or recalculation of current tickets. The new rules only apply to tickets created from now on, and to future assign/unassign actions.
2b. **BACKLOG for fully unassigned tickets** — when a non-Project ticket has both FE and BE dev status blank and no PMBA override, its status is set to BACKLOG and the status rules are skipped. A single blank side still counts as To Do, as today.
2c. **Status rules preview** — the preview matrix in Status rules gets a row: "No dev status (unassigned) → BACKLOG".
3. **CSV / feedback import** — stop sending `todo` for unassigned sides; send the CSV status only where an assignee is given.
4. **Display** — ticket detail, lists, board and bulk actions show a blank "—" chip for an unassigned side instead of To Do; the dev status picker is disabled until someone is assigned on that side (hint: "Assign someone first").
5. **Bulk assign** — keep its reset-to-To-Do only for sides that end up assigned.

## Tests
- Small vitest for the display rule (no assignee shows blank; assignee shows the stored status).
- Status tests: both blank → BACKLOG; assign FE (FE becomes To Do) → follows the rules (To Do + To Do → TO DO); remove the last assignee again → BACKLOG.
- DB check after migration: a newly created unassigned ticket has blank dev status and BACKLOG; assigning someone sets To Do; removing them blanks it. Existing ticket counts unchanged.

## Technical notes
- New BEFORE INSERT trigger `enforce_blank_unassigned_status` on `public.tickets` (skips `ticket_type = 'Proj'`); on INSERT assignees don't exist yet, so both sides go blank and the assignee trigger fills To Do.
- `derive_project_status`: early branch `IF NEW.fe_status IS NULL AND NEW.be_status IS NULL AND NOT NEW.project_status_override THEN NEW.status_id := (SELECT id FROM statuses WHERE name='BACKLOG' AND category='backlog' LIMIT 1); RETURN NEW;` — fires on the ticket UPDATE made by the assignee trigger. Mirror the same check in `evaluateRule.ts` and test it in `evaluateRule.test.ts`.
- Remove `?? "todo"` coercion in `fetchTicketDetail.ts`, `useProjectTickets*`; `DisciplineStatus | null` in types where needed.
- Board/sprint discipline columns: unassigned sides aren't shown as cards (unchanged behaviour for cards with assignees).
