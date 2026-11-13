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

### 2. Speed up edit, delete and log (needs your approval: database permission change)
- Rewrite the time log permission rules to check "is this person on the project" once per request instead of once per ticket. The access stays exactly the same: PMBAs see everything, members see their projects, and people can only edit or delete their own logs (PMBAs can edit or delete any).
- No tables, columns or data change.

### 3. Verify
- Time a member's edit and delete on Cousteau before and after the change.
- Add a test showing that saving the same log twice creates only one log.

## Technical details
- Client-generated `id` (crypto.randomUUID) in useLogTime, submitInlineLogs and useStopGroup. On a 23505 duplicate-key error, treat the save as a success.
- New policies: SELECT `(select current_is_pmba()) OR ticket_id IN (select t.id from tickets t join project_members pm on pm.project_id=t.project_id where pm.user_id=(select current_team_member_id()))`. UPDATE/DELETE wrap the helper calls in `(select ...)` so they're evaluated once. INSERT stays as is.
