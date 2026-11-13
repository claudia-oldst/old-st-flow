# Edit every part of a time log + faster opening

## What changes
The "Edit time log" window (used from the ticket dialog and My Timelogs) will let you change:
- **Date** and **start time** (when the work was logged)
- **Duration** (hours / minutes) — as today
- **Discipline** (FE / BE / Project; Project tickets stay Project)
- **Ticket** — searchable picker of tickets in the same project you're assigned to (same picker style as the inline "Add log" row)
- **Description / note**
- Delete — as today

The estimate check still applies: if the new ticket/discipline/duration would go over the available estimate, you get the existing "Adjust estimate" flow (pending revision for non-PMBAs, per the existing rule).

## Faster opening from My Timelogs
Today the page waits for the full ticket to download before showing the window. Instead the window opens instantly using the data already on the row; ticket details (estimates) load in the background and only the capacity line / Save guard waits for them (shows a small loader).

## No database changes
Existing database logic already recalculates hours on both the old and new ticket when a log is moved, so nothing in Supabase needs to change.

## Technical details
- `EditTimeLogDialog`: accept `ticket` optional + `ticketId/projectId`; lazy-fetch with `fetchTicketDetail` when absent; add date (`Input type=date`) + time (`type=time`) built from `logged_at` via `formatLoggedAt`/tz offset, `DisciplinePicker`, and a ticket picker (single-select variant reusing the InlineTicketPicker command list pattern; extract a shared single-select if needed to stay <250 LOC).
- Update payload: `{ hours, note, logged_at, ticket_id, discipline }`; capacity computed for the selected ticket (exclude this log only when ticket+discipline unchanged).
- `MyTimelogs.openEdit`: set editing synchronously, no await.
- Split dialog into `EditTimeLogFields.tsx` to keep files under 250 LOC.
- Add a small test for the capacity "exclude own log only if same ticket+discipline" rule.
