## Goal
Permanently delete the project **Test Project** (acronym `TEST`, id `37bc863c-0c5f-465b-9e97-23662a86c81a`) and every piece of data associated with it. This cannot be undone.

## What gets deleted
Executed via one migration that calls the existing `purge_project_children(_project_id)` function, then deletes the project row itself.

`purge_project_children` already removes, scoped to the project:
- tickets and their time_logs, ticket_estimate_changes, ticket_comments, ticket_assignees
- active_timers and active_timer_tickets for those tickets
- project_epics, project_epic_summaries, epic_discounts
- sprints, sprint_tickets, sprint_capacities
- project_members

After that runs, we `DELETE FROM public.projects WHERE id = '37bc863c-...'`.

Not touched: team_members, user_roles, statuses, status_derivation_rules (all global/shared).

## Steps
1. Run one migration:
   ```sql
   SELECT public.purge_project_children('37bc863c-0c5f-465b-9e97-23662a86c81a');
   DELETE FROM public.projects WHERE id = '37bc863c-0c5f-465b-9e97-23662a86c81a';
   ```
2. Verify: `SELECT count(*) FROM projects WHERE id = '37bc863c-...'` returns 0.

## Notes
- Vault archive is skipped — you asked for a hard delete, so no recovery snapshot is created. If you'd like a vault export first as a safety net, say the word and I'll archive-then-delete instead.
- Dennis Testing (DEM) is untouched.
