# Sort projects by last activity

Add a sortable "Last activity" option to the Projects workspace so the most recently edited projects appear first. "Last edit" includes any activity on the project itself and its related work (tickets, comments, time logs, sprints, epics).

## What we will change

1. **Database** — track the latest activity per project.
   - Create a new `public.project_last_activity` table with `project_id` (FK → `projects.id`) and `last_activity_at`.
   - Backfill existing rows by computing the latest timestamp from `projects`, `tickets`, `ticket_comments`, `time_logs`, `sprints`, `project_epics`, and `project_epic_summaries`.
   - Add a `public.bump_project_last_activity()` trigger function that updates `project_last_activity.last_activity_at` to `now()` whenever a tracked record changes.
   - Attach `AFTER INSERT/UPDATE/DELETE` triggers to the tracked tables and `AFTER INSERT/UPDATE` to `projects` itself.
   - Add RLS policies so authenticated project members can read the activity row.

2. **Projects list query** — surface the new sort.
   - Extend `useProjectsList` sort keys from `newest | oldest | name | archived` to include `last_activity`.
   - When `sort === "last_activity"`, select `last_activity_at` via the new table and order by it descending.

3. **Toolbar** — expose the option.
   - Add a "Last activity" item to the sort dropdown in `ProjectsToolbar`.

4. **Project card** — show the timestamp.
   - Display the `last_activity_at` value as a small timestamp on `ProjectCard` (per the existing design doc), replacing the plain "ticket count" footer with the date line.

## Default behavior

- The default sort changes to "Last activity" (most recently edited projects first).
- `Projects.tsx` initial sort state defaults to `last_activity` when no URL `sort` parameter is present.
- "Newest" remains an option in the sort dropdown for users who want to switch back.
- Sort state is stored in the URL as `?sort=last_activity`, so links and refreshes preserve the view.


## Technical notes

- A separate `project_last_activity` table is used instead of adding a column to `projects` so that `projects.updated_at` keeps its original meaning (when the project record was edited directly) while still allowing activity-based sorting.
- The Supabase JS client can join `project_last_activity` through the FK relationship and order by `project_last_activity.last_activity_at`.
