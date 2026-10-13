# Doneness on both Health rings

On the Frontend, Backend and Project cards on the Health tab, both existing rings become doneness rings. Each one is coloured by ticket status instead of a single burn arc. No new rings and no legend; the centre text and the hours list stay as they are.

## Behaviour
- **Outer ring (current):** sized by each ticket's current estimate for that discipline.
- **Inner ring (original):** sized by each ticket's original estimate for that discipline.
- **Fill order (both rings):** clockwise from 12 o'clock: In Progress (yellow), then For Integration (purple), then Done (green).
- **To Do:** the rest of each ring is To Do, shown as the faint empty track.
- **Which status each card uses:**
  - **Frontend:** each ticket's FE status.
  - **Backend:** each ticket's BE status.
  - **Project:** Project tickets use the same status the board shows for them.
- **Centre text:** the "Current %" and "Original %" stay, still showing hours burned against each estimate.
- **Which tickets count:** the same set as the rest of the page. The version filter applies, and unapproved CRs are left out.
- **Hover:** hovering a ring shows the hours and % for each status, including To Do, for that estimate.
- **Empty state:** a ring with no estimated hours shows as the empty track.

## Technical
- New `src/features/health/overview/doneness.ts`: a pure function `donenessHours(tickets, statuses, discipline, basis: "current" | "original")` that returns `{ todo, in_progress, for_integration, done }` in hours, with unit tests for both bases.
  - FE uses `fe_status` and BE uses `be_status`.
  - Project reuses the board's `CATEGORY_TO_DISCIPLINE` mapping from the ticket's status category.
- New colour tokens in `index.css` for In Progress (yellow), For Integration (purple) and Done (green).
- `Ring.tsx`: new `donenessCurrent` and `donenessOriginal` props. Each ring is drawn as three dash-offset arcs starting at 12 o'clock and going clockwise In Progress → For Integration → Done, replacing the single burn arc. A small shared `DonenessArcs` helper keeps the file under 250 lines.
- `ProjectHealth.tsx`: compute both doneness sets per discipline and pass them to each Ring.
- No database changes. Update `docs/pages/project-health.md`.
