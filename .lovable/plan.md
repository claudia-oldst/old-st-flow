# Doneness ring on the Health rings

Add an outer "doneness" ring to the Frontend, Backend and Project rings on the Health tab, plus a small legend with counts under each ring. The existing burn rings stay as they are and move inwards.

## Behaviour
- **Outer ring:** split by ticket count into status segments, running clockwise from 12 o'clock: To Do (grey), then In Progress (yellow), then For Integration (purple), then Done (green).
- **Which status each ring uses:**
  - **Frontend:** each ticket's FE status, for tickets with FE work (an FE estimate or an FE assignee).
  - **Backend:** each ticket's BE status, for tickets with BE work.
  - **Project:** Proj tickets have no FE/BE status, so this ring uses the ticket's project status instead: backlog → To Do, active → In Progress, dev done → For Integration, done → Done.
- **Which tickets count:** the same set as the rest of the page. The version filter applies, and unapproved CRs are left out (matching the epic risk table).
- **Legend:** a row of coloured dots under each ring with labels and counts: To Do · In Progress · For Integration · Done.
- **Hover:** hovering a segment shows "In Progress — 5 tickets (12%)".
- **Empty state:** when a discipline has no tickets, the outer ring shows as a faint empty track.

## Technical
- New `src/features/health/overview/doneness.ts`: a pure function `donenessCounts(tickets, statuses, discipline)` that returns `{ todo, in_progress, for_integration, done }`, with a unit test.
- New colour tokens in `index.css` (`--status-todo`, `--status-progress`, `--status-integration`, `--status-done`). In Progress is yellow here, so the token is separate from the existing blue chip colour.
- `Ring.tsx`: an optional `doneness` prop draws the outer segmented arcs as SVG circles with dash offsets, starting at 12 o'clock and going clockwise. The burn ring radii shrink slightly to make room. The legend sits below the ring.
- `ProjectHealth.tsx`: compute the doneness counts per discipline and pass them to each Ring.
- No database changes. Update `docs/pages/project-health.md`.
