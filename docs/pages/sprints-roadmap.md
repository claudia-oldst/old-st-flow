# Sprints — Roadmap tab

**`/projects/:id/sprints?stab=roadmap`.** One ticket table where each ticket is planned or committed per sprint and discipline. People live only on the ticket's assignees; sprints record what is committed, not who.

## Working sprint
- Pills along the top; defaults to the sprint covering today, else the next one. Kept in the URL (`ws`).
- The capacity panel below shows FE/BE bars and one row per developer for that sprint. "Developers" chooses who is shown; clicking a developer toggles the Assignee filter.

## Table
- Columns: ID, Title, Status, FE · BE status, Assigned (FE/BE avatars, click to assign), Hours (actual/estimate, coral when over), then FE | BE cells per visible sprint.
- Sprint columns default to the working sprint + the one before; the working sprint is always shown (URL `cols`).
- Group by None / Epic / Type / Status / Assignee (default Epic; URL `group`). Groups collapse and have a select-all checkbox.
- Dev done / Done and Proj tickets are hidden unless toggled on or chosen in a filter. Feedback is never shown.
- Filters: Epic, Type, Status, FE status, BE status, Assignee (incl. Unassigned), Sprint (Unfinished from previous sprint, Not planned, Planned / Committed / Unplanned per sprint). Search and one-shot AI search respect the filters.
- A warning marker shows when only one discipline is in the working sprint and the other has hours.

## Cells
- None / Planned / Committed. Click an empty cell to plan; click a filled cell for a menu. "–" means no hours for that discipline.
- Planned is one sprint per discipline, so planning elsewhere moves it.
- Committing in an open sprint removes that discipline's commitment from other open sprints and sets the planned sprint to the same one. Committing something that wasn't planned there shows as "Unplanned" (coral).
- Closed sprints can be edited after a one-time confirmation per sprint; this never changes other sprints or the planned sprint.
- Every change updates the table, totals and capacity bars at once, with Undo.
- Cell changes never touch assignees, so no Slack messages are sent.

## Bulk bar
- FE + BE | FE | BE → Set to None / Planned / Committed in the working sprint, or Assign people.

## Assign people
- No sprint picker. On the Roadmap, each FE/BE chip shows that person's working-sprint load and previews the change ("33 → 45 / 60h"), coral if over.

## Footer
- Per visible sprint and discipline: committed count (unplanned), planned count, total hours / capacity.
