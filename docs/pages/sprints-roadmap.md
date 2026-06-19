# Sprints — Roadmap

**Sub-tab of `/projects/:id/sprints`.**

A horizontal Gantt that lays out every epic against every sprint on the roadmap.

## Toolbar
- **Discipline filter** — segmented control: **FE / BE / ALL**. ALL merges FE and BE rows by epic, summing committed/planned/done counts.
- **Sprint editing** (PMBA) — clicking a sprint header opens the **Edit Sprint** popover to rename, change start/end dates, set capacity, or delete the sprint. A "+ Sprint" button at the end of the timeline appends a new sprint block.
- **Today** marker — vertical dashed line.

## Rows
- One row per epic, sorted alphabetically. Epics with no plan/commitment still appear so PMBA can plan them in.
- Each cell is a segmented bar showing, for that epic in that sprint:
  - committed (solid), planned (hatched), in-progress (mid colour), done (filled), todo (outline).
- A small "Committed" pill marks sprints where the epic has been committed to the client.

## Interactions
- Hovering a cell shows a tooltip with exact numbers and ticket counts.
- Clicking a cell opens the Planning sub-tab pre-filtered to that epic + sprint.
- Updates appear in real time as tickets move, get assigned, or are re-estimated.

## Empty state
"No sprints yet — add the first sprint to start planning" with a primary **+ Sprint** button (PMBA only).
