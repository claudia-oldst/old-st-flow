## Goal
Permanently delete two projects and everything attached to them. No vault archive, no restore path.

| Project | Acronym | Tickets | Time logs | Epics | Sprints | Members |
| --- | --- | --- | --- | --- | --- | --- |
| Project Cousteau | COUT | 471 | 1,493 | 55 | 2 | 14 |
| Dennis Testing | DEM | 0 | 0 | 0 | 0 | 1 |

**Project Cousteau R1 (COU) is a different project and will not be touched.**

## How

A single data operation (no schema change) for each project id:
- `b95f5c11-16a9-4b2f-a410-00ba79f88f15` — Project Cousteau
- `36aa2c91-61e3-4098-9fc5-f3d41313852c` — Dennis Testing

Steps per project, in dependency order:
1. Call `public.purge_project_children(<project_id>)`, which removes time logs, estimate changes, comments, ticket assignees, active timers, epic summaries, epic discounts, sprint tickets, sprint capacities, sprints, tickets, epics and project members.
2. Delete the `projects` row itself.

Team member records, statuses and global settings are untouched — only project-scoped rows are removed.

## Verification
Re-query `projects`, `tickets`, `sprints`, `project_epics` and `time_logs` for those two ids and confirm zero rows remain, and that COU (Project Cousteau R1) still has its full data.

## Notes
This is irreversible. Nothing in the app code changes.
