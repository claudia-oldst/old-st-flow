# Fix "Tickets could not load" for non-PMBA users (e.g. Brygs, QA)

## What's happening
Brygs's Tickets tab on Project Cousteau fails with "canceling statement due to statement timeout". The ticket list query runs too long and the database stops it.

Brygs is a regular member of 7 projects, not a PMBA. PMBAs pass the access checks at once. For everyone else, the database re-runs the "is this person on the project?" check for every ticket, every assignee and every team member it reads. On a large project like Cousteau (1,000+ tickets), that pushes the query past the time limit.

This is the likely cause based on the access rules, but it isn't confirmed yet. Step 1 confirms it before anything changes.

## Plan
1. **Confirm it.** Time the ticket list query as Brygs, then as a PMBA, on Project Cousteau.
2. **Check access once per request.** The ticket list checks once at the start that the person is a PMBA or a member of the project. After that it reads the tickets directly, without repeating the check on every row. Non-members still get nothing.
3. **Speed up the shared access rules.** Make the rules on tickets, assignees, time logs, project members and team members check the current person once per query, not once per row. Who can see what stays the same.
4. **Verify.** Re-time the query as Brygs on Cousteau. It should finish well under the limit and return the same tickets as before.

No ticket data changes.

## Technical details
- `list_project_tickets`: change to `SECURITY DEFINER` and add a guard at the top: `IF NOT (current_is_pmba() OR current_is_project_member(_project_id)) THEN RETURN '{"total":0,"rows":[]}'`. The function is scoped to `_project_id`, so no rows from other projects can leak.
- RLS policies: wrap helper calls as `(SELECT public.current_is_pmba())` and `(SELECT public.current_team_member_id())` so Postgres runs them once per query. Rewrite the `team_members` scoped-read self-join to use a cached member id.
- Add an index on `project_members(user_id, project_id)` if one doesn't already exist.
- Measure with `EXPLAIN ANALYZE` after setting `request.jwt.claims` to Brygs's auth id (8071ef10-…).
