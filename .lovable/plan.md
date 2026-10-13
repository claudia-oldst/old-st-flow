# Doneness ring on the Health rings

Add an outer "doneness" ring to the Frontend, Backend and Project rings on the Health tab. Nothing else on the cards changes (no legend or counts). The existing burn rings stay as they are and move inwards slightly.

## Behaviour
- The outer ring fills clockwise from 12 o'clock like a progress ring: Done (green), then For Integration (purple), then In Progress (yellow).
- The rest of the ring is To Do. It shows as the faint empty track, not a coloured segment.
- Segments are sized by estimate hours, not ticket count. Each ticket adds its current estimate for that discipline to its status, so big tickets take up more of the ring.
- Which status each ring uses:
  - **Frontend:** each ticket's FE status, weighted by its FE estimate.
  - **Backend:** each ticket's BE status, weighted by its BE estimate.
  - **Project:** this ring uses the ticket's project status instead (backlog → To Do, active → In Progress, dev done → For Integration, done → Done), weighted by the project estimate.
- Which tickets count: the same set as the rest of the page. The version filter applies, and unapproved CRs are left out.
- Hovering the ring shows the hours and % for each status, including To Do.
- When a discipline has no estimated hours, the whole outer ring is the empty track.

## Technical
- New `src/features/health/overview/doneness.ts`: a pure function `donenessHours(tickets, statuses, discipline)` that returns `{ todo, in_progress, for_integration, done }` in hours, with a unit test.
- New colour tokens in `index.css` for In Progress (yellow), For Integration (purple) and Done (green).
- `Ring.tsx`: an optional `doneness` prop draws the outer arcs as SVG circles with dash offsets, starting at 12 o'clock and going clockwise in the order Done, For Integration, In Progress; the remainder is the track. The burn ring radii shrink slightly to make room.
- `ProjectHealth.tsx`: compute the doneness per discipline and pass it to each Ring.
- No database changes. Update `docs/pages/project-health.md`.
