# Speed up the Tickets list and fix "Tickets could not load"

## What's happening
- **Brygs (QA, regular member):** the Tickets tab on Project Cousteau fails with "statement timeout". For anyone who isn't a PMBA, the database re-runs the "is this person on the project?" check for every ticket, assignee and team member it reads. On a project with 1,000+ tickets, that pushes the query past the time limit. This is the likely cause based on the access rules, and step 1 confirms it.
- **Everyone, PMBAs included:** the list is slow even when it loads. Your screenshot shows a 6.4-second request returning 3.9 MB. That's because each assignee on each ticket comes back with their full team-member record.

## Plan
1. **Confirm it.** Time the ticket list query as Brygs and as a PMBA on Project Cousteau.
2. **Check access once per request.** The list checks once at the start that the person is a PMBA or a project member. After that it reads tickets without repeating the check on every row. Non-members still get nothing.
3. **Speed up the shared access rules.** The rules on tickets, assignees, time logs, project members and team members check the current person once per query, not once per row. Who can see what doesn't change.
4. **Send back less.** For each assignee, the list returns only what the screen shows.
5. **Verify.** Re-time the query as Brygs and as a PMBA. Both should load in about 2 seconds or less and show the same tickets as before.

No ticket data changes.

## Technical details
- `list_project_tickets`: change to `SECURITY DEFINER` and add a guard at the top: `IF NOT (current_is_pmba() OR current_is_project_member(_project_id))`, return empty. The query is already scoped to `_project_id`.
- RLS: wrap helper calls as `(SELECT public.current_is_pmba())` and `(SELECT public.current_team_member_id())` so they're evaluated once as initPlans. Rewrite the `team_members` scoped-read self-join to use them.
- Assignee `member`: replace `to_jsonb(tm)` with id, name, email, avatar_color, role. Check that the frontend mapping only uses these fields.
- Add an index on `project_members(user_id, project_id)` if one is missing.
- Measure with `EXPLAIN ANALYZE` after setting `request.jwt.claims` to Brygs's auth id.
