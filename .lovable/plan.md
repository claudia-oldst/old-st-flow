# Doneness ring on the Health rings

Add a third, outermost "doneness" ring to the Frontend, Backend and Project rings on the Health tab. The two existing burn rings (current and original) stay exactly as they are, inside it. Nothing else on the cards changes (no legend or counts).

## Behaviour
- **Fill order:** the outer ring fills clockwise from 12 o'clock: In Progress (yellow), then For Integration (purple), then Done (green).
- **To Do:** the rest of the ring is To Do, shown as the faint empty track rather than a coloured segment.
- **Sizing:** segments are sized by current estimate hours. Each ticket adds its current estimate for that discipline to its status.
- **Which status each ring uses:**
  - **Frontend:** each ticket's FE status, weighted by its current FE estimate.
  - **Backend:** each ticket's BE status, weighted by its current BE estimate.
  - **Project:** the ticket's project status (backlog → To Do, active → In Progress, dev done → For Integration, done → Done), weighted by its current project estimate.
- **Which tickets count:** the same set as the rest of the page. The version filter applies, and unapproved CRs are left out.
- **Hover:** hovering the ring shows the hours and % for each status, including To Do.
- **Empty state:** when a discipline has no estimated hours, the whole outer ring is the empty track.

## Technical
- New `src/features/health/overview/doneness.ts`: a pure function `donenessHours(tickets, statuses, discipline)` that returns `{ todo, in_progress, for_integration, done }` in current-estimate hours, with a unit test.
- New colour tokens in `index.css` for In Progress (yellow), For Integration (purple) and Done (green).
- `Ring.tsx`: an optional `doneness` prop adds a third SVG ring outside the existing two. Its arcs use dash offsets, starting at 12 o'clock and going clockwise In Progress → For Integration → Done; the remainder is the track. The existing ring radii shrink slightly so all three fit.
- `ProjectHealth.tsx`: compute the doneness per discipline and pass it to each Ring.
- No database changes. Update `docs/pages/project-health.md`.
