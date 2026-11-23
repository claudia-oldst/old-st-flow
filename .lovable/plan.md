# Let everyone change the Overall (Proj) status, in bulk and in the drawer

## What's happening now
- **Drawer:** only PM/BAs get the Overall status dropdown and the "Reset to auto" button. Everyone else, Reg included, sees a read-only pill. That's why Reg couldn't override it.
- **Bulk:** the Status option in the bulk bar on the Tickets page already appears for any project member. It's hidden only from people who aren't on the project.
- **Database:** any signed-in user is already allowed to save a ticket status, so this needs no database change.

## Changes
1. **Drawer:** every user gets the Overall status dropdown. A manual choice is marked "Set manually", and every user can also use "Reset to auto".
2. **Bulk:** the Status option shows for every signed-in user, on both the Tickets page and the Feedback page.
3. **Failed saves:** if a status change doesn't save (Reg's report showed his connection dropping), the old status comes back and a clear "Status not saved" message appears with a Retry button. The status no longer quietly snaps back.
4. Nothing else changes. Estimate edits, epics, versions, delete and the other PM/BA-only actions stay PM/BA-only, and status changes still send no notifications.

## Technical details
- `src/features/tickets/detail/StatusBlock.tsx`:
  - Render the Overall `Select` and "Reset to auto" for all users. `isPMBARole` keeps gating only the assign shortcut.
  - Add a rollback of `status_id`/`project_status_override` and a toast with a Retry action when the save fails.
- `src/features/tickets/ProjectTickets.tsx`: change `canEditStatus` to true for any signed-in user, not just project members with a role. `BulkActionsBar` already supports this.
- Save a memory rule: every user can override the overall status.
- No migrations, RLS or trigger changes.
