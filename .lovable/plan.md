# Sprints Roadmap: use the Tickets page toolbar

## What changes
The Roadmap toolbar will look and behave like the Tickets page toolbar:
- **One row, same layout:** Group by dropdown, the single **Filter** button (same popover with Type, Status, FE/BE status, Health, Epic, Assignee, Version, Acceptance criteria), **Columns** menu, then search on the right with the AI toggle.
- **Group by:** the same Tickets options and dropdown, default still Epic.
- **Columns:** the same show/hide menu as Tickets (ID, title, status, dev status, FE/BE, assignees, epic, created/updated, etc.). Sprint columns are always shown and stay controlled by the existing "Sprint columns" picker, which sits beside the Columns menu.
- **Version filter:** filter Roadmap tickets by version, the same way as on Tickets (part of the shared Filter popover).
- **Sprint filter stays:** the Roadmap-only Sprint filter (Unfinished from last sprint, Not planned, Planned/Committed SX) stays as an extra button next to Filter, since Tickets doesn't have it.
- Board/List toggle, My tickets toggle, Start Timer and Add buttons are hidden on Roadmap.
- The separate Epic/Type/Status/FE/BE/Assignee/Acceptance pills go away (they move into the shared Filter popover).

No database changes. No change to sprint cells, capacity bar or bulk actions.

## Technical details
- `RoadmapView` renders `ProjectTicketsToolbar` (as Feedback does) with `showViewToggle/showMineToggle/showAddButtons/showGroupTimer=false`, `extras` = Sprint filter + `SprintColumnsPicker`, and `useColumnDisplayPrefs` passed to both toolbar and `TicketsList` (`columnPrefs`, wider `columns` list).
- `useRoadmapView`: filters become `TicketFilters` applied with the shared `applyFilters`, then the Roadmap sprint filter (kept from `roadmapFilters.ts`, reduced to the sprint key) on top; group-by uses Tickets `GroupBy` (still in the URL).
- Delete `RoadmapToolbar.tsx`, `roadmapGroups.ts`; trim `roadmapFilters.ts` and update its test.
