# Doneness on the current estimate ring (Health)

On the Frontend, Backend and Project rings on the Health tab, the outer ring (current estimate) becomes the doneness ring. The inner ring (original estimate) and everything else on the card stay as they are. No third ring and no legend.

## Behaviour
- **Fill order:** the current estimate ring fills clockwise from 12 o'clock: In Progress (yellow), then For Integration (purple), then Done (green).
- **To Do:** the rest of the ring is To Do, shown as the faint empty track.
- **Sizing:** segments are sized by current estimate hours. Each ticket adds its current estimate for that discipline to its status.
- **Which status each ring uses:**
  - **Frontend:** each ticket's FE status.
  - **Backend:** each ticket's BE status.
  - **Project:** the ticket's project status (backlog → To Do, active → In Progress, dev done → For Integration, done → Done).
- **Centre text:** the "Current %" stays, still showing hours burned against the current estimate. Only the ring's colouring changes from burn to doneness.
- **Which tickets count:** the same set as the rest of the page. The version filter applies, and unapproved CRs are left out.
- **Hover:** hovering the ring shows the hours and % for each status, including To Do.
- **Empty state:** when a discipline has no estimated hours, the ring is the empty track.

## Technical
- New `src/features/health/overview/doneness.ts`: a pure function `donenessHours(tickets, statuses, discipline)` that returns `{ todo, in_progress, for_integration, done }` in current-estimate hours, with a unit test.
- New colour tokens in `index.css` for In Progress (yellow), For Integration (purple) and Done (green).
- `Ring.tsx`: when the `doneness` prop is present, the outer circle is drawn as three dash-offset arcs, starting at 12 o'clock and going clockwise In Progress → For Integration → Done, instead of the single burn arc. The inner original ring is unchanged.
- `ProjectHealth.tsx`: compute the doneness per discipline and pass it to each Ring.
- No database changes. Update `docs/pages/project-health.md`.
