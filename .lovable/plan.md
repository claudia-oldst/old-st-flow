# Inline time logging on My Timelogs

Replace the "Log time" modal flow on the My Timelogs page with an inline draft row, styled like the Add Tickets draft rows.

## Behaviour

Clicking "Log time" reveals an inline row pinned at the top of the list (above the groups), inside the same glass card treatment as the ticket draft rows.

All fields sit on a single line per entry — one compact row, no wrapping to a second line:

```text
Project ▾ | Ticket ▾ | What you did… | Date 📅 | Start | 2h | 30m | [Save] [x]
```

- Project: projects the user is a member of (same list as the page filter).
- Ticket: tickets in that project the user is assigned to; disabled until a project is picked.
- What you did: free text note, takes the flexible remaining width.
- Date: compact calendar popover, defaults to today.
- Start time: optional `HH:mm`; when set it becomes the time-of-day part of the log timestamp, otherwise the current time is used. No schema change — this writes into `logged_at`.
- Hours / minutes: two narrow numeric inputs, combined into decimal hours with the existing helper.

Each control uses fixed narrow widths (h-8, xs text) with the note field flexing, so the row stays on one line at normal desktop widths and scrolls horizontally on very narrow screens rather than stacking.

Save inserts the log, clears the row (keeping the selected project so consecutive logs are quick), and refreshes the list. Escape or the x cancels. Enter in the last field saves.


## Rules kept from the modal

- Only tickets the user is assigned to are selectable.
- Discipline is derived automatically from the user's project role and their slots on the ticket (FE / BE / Project). When more than one is valid, a small discipline select appears in the row; otherwise it is hidden.
- The existing guard stays: a log is rejected if the ticket has no estimate for that discipline or the entry would exceed available hours, with the same toast message.
- Logging still promotes a backlog ticket to the first active status.
- Source is recorded as `manual`.

## Technical notes

- Edit `src/pages/MyTimelogs.tsx` to render the inline row and drop `NewTimeLogDialog` usage; delete `src/features/timelog/my-timelogs/NewTimeLogDialog.tsx`.
- New file `src/features/timelog/my-timelogs/InlineLogRow.tsx` plus a small `useInlineLogDraft.ts` holding draft state, discipline derivation and the insert. Reuse `useMyProjects` / `useMyProjectTickets`, `hoursMinutesToDecimal`, `useTicketCapacity` + `capacityFor`, `fetchTicketDetail` and `useProjectRole`.
- Editing stays available: clicking any existing log row still opens `EditTimeLogDialog` so users can change hours, note, discipline and date, or delete the log — unchanged.
- No database or RLS changes.
