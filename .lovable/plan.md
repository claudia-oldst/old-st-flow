# Fix duplicate time logs and edit/delete timeouts

## What I found
- No exact duplicate time logs in Cousteau in the last 30 days. There are a few near-identical pairs (same person, ticket and hours, saved 1-2 minutes apart). This fits someone pressing Save again after the first save looked stuck, or the app retrying.
- Saving, editing and deleting hours are slow because of the permission check on time logs. For anyone who isn't a PMBA, every request runs a project membership check against all ~4,100 tickets. Loading a ticket's time logs averages 0.4s and peaks near 8s. Edits and deletes run the same check, plus an extra one that recalculates the ticket's hours, so they can go past the time limit.
- The root cause of the slowness is confirmed. The cause of the "double record" is likely, but I haven't proven it.

## Changes

### 1. Stop double saves (app only, no database changes)
- Every Log time / Stop timer / inline log window gets an ID before saving. If the same save is sent twice, the second attempt is recognised as already done instead of creating a second log.
- The Save button locks as soon as it's clicked, until there's an answer.
- If the save times out, the app checks whether the log was actually saved before showing an error.

### 2. Lighter permission checks (needs your approval: database permission change)
- Viewing time logs: one check per request, "is this person allocated to the project", instead of checking every ticket.
- Logging time: allowed if the person is assigned to that ticket (PMBAs can always log). The project check is dropped, since being assigned already implies being allocated.
- Editing or deleting: people can change their own logs and PMBAs can change any, checked once per request.
- No tables, columns or data change.

### 3. Verify
- Time a member's edit and delete on Cousteau before and after the change.
- Add a test showing that saving the same log twice creates only one log.

## Technical details
- Client-generated `id` (crypto.randomUUID) in useLogTime, submitInlineLogs and useStopGroup. On a 23505 duplicate-key error, treat the save as a success.
- SELECT: `(select current_is_pmba()) OR ticket_id IN (select t.id from tickets t join project_members pm on pm.project_id=t.project_id where pm.user_id=(select current_team_member_id()))`. The membership set is computed once, not per ticket.
- INSERT: `(select current_is_pmba()) OR (user_id=(select current_team_member_id()) AND EXISTS(select 1 from ticket_assignees a where a.ticket_id=time_logs.ticket_id and a.user_id=time_logs.user_id))`.
- UPDATE/DELETE: `(select current_is_pmba()) OR user_id=(select current_team_member_id())`.
