# Assignment on Feedback tickets (for discussion only)

## What changes
- **Feedback tab list**: add the **Assignees** column (same as the Tickets tab), included in the column show/hide menu. Clicking it opens the normal assign picker (FE / BE / Project).
- **Feedback ticket details**: show the Assignees section so people can be added/removed there too.
- **Bulk actions**: on the Feedback tab, allow bulk **Assign** (still no timers, no dev-status changes).
- **Still blocked until converted**: timers, time logging, dev (FE/BE) status, sprints. Feedback stays a "discussion" stage.
- **On convert**: existing assignees carry over to the real ticket (the convert window already keeps them), and their dev status starts at To Do.

## Notes
- No database changes needed — feedback tickets can already hold assignees.
- Assigned people will get the usual Slack "you've been assigned" message (respecting project Slack settings). Tell me if you'd rather mute that for Feedback.

## Technical details
- `ProjectFeedback.tsx` / `ColumnDisplayMenu`: add `assignees` to the Feedback column allow-list.
- `TicketDetailBody.tsx`: render assignees block when `isFeedback`; keep timers/status/time logs hidden.
- `BulkActionsBar.tsx`: show the Assign menu when `feedback` is true; keep timer and status menus hidden.
- `AssignDialog` already accepts `ticketType="Feedback"`.
- Update AGENTS.md rule: Feedback triage now allows assignment (discussion only) but still hides discipline status and timers.
- Add a small test that Feedback tickets show assignment but not timer/time-log actions.
