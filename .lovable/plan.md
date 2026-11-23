# Fix: Reg can't override the Overall (Proj) status in the ticket drawer

## What the report shows
- Reg was on a project page and couldn't change the Overall status in the ticket drawer.
- Every request in his report failed outright (status 0), including the tickets, statuses and time-log loads. His connection to the database dropped while he tried, so no save could have worked at that moment.
- In the drawer, only PM/BAs get the Overall status dropdown. Everyone else sees a read-only pill. If Reg isn't a PM/BA, the screen is behaving as designed.
- When a save fails, the drawer briefly shows the new status and then quietly goes back to the old one. The only sign is a small error message, so it feels like the change "won't stick".

## Root cause
I haven't confirmed it yet. I can't read the live database from here, so step 1 is to check it.

## Steps
1. **Investigate (read-only, no data changes):** look up Reg's role and try an override as a PM/BA on a Cousteau ticket. This shows which of these it is:
   - a) Reg isn't a PM/BA, so this is expected behaviour.
   - b) a dropped connection.
   - c) a real save bug.
2. **If (b) or (c): make failures visible and stop the snap-back.**
   - If the save fails, put the old status back clearly.
   - Show a clear error that says "Status not saved, check your connection" and has a Retry button.
3. **If (c): fix the save itself.** Check that choosing a status keeps it marked "Set manually" and that the automatic status rule doesn't overwrite it. Any database change would be explained and approved first.
4. **If (a):** leave it as it is unless you want developers to be able to override. That's your call: under the current rule only PM/BAs can override.

## Technical details
- `src/features/tickets/detail/StatusBlock.tsx`: `setProjectStatus` patches optimistically but doesn't roll back on error. Add a rollback to the previous `status_id`/`project_status_override`, plus a toast with a Retry action.
- Confirm that the `derive_ticket_status` trigger respects `project_status_override = true` on a direct `status_id` update (migration 20260424150138 flags overrides).
- No schema changes planned. No notifications affected.
