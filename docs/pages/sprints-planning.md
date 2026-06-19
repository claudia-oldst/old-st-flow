# Sprints — Planning

**Sub-tab of `/projects/:id/sprints`.**

A two-pane planning surface: a **Pool** of tickets on the left, **per-developer columns** for the selected sprint on the right. Used to commit work to a sprint and balance it across developers.

## Top bar
- **Sprint selector** — picks the sprint being planned.
- **Discipline toggle** — FE / BE.
- **Capacity indicator** — total committed hours vs. sprint capacity for the chosen discipline.

## Pool (left)
- **Filter bar:**
  - **Roadmap selection** dropdown — multi-select list of sprints whose tickets feed the pool, plus **Unplanned** and an **All** checkbox that snaps every roadmap on. Selection label shows "All roadmaps" when All is on, otherwise comma-separated sprint names.
  - **Epic** multi-select, **Status** multi-select, search input.
- Grouped ticket list (by epic). Each card shows estimate, current FE/BE status chips, and assignees.
- Tickets are draggable into a developer column.

## Developer columns (right)
- One column per developer who has capacity for the chosen discipline.
- Header: avatar, name, "committed h / capacity h" with a capacity bar (turns coral when over).
- Body: stacked ticket cards for that developer in this sprint. Drag to reorder, drag across columns to reassign, drag back to the pool to uncommit.
- A "+ Add" picker per column searches the pool without leaving the column.

## Carryover
When the selected sprint has tickets carried over from a previous sprint, a **Carryover review** banner appears above the columns with one-click "Bring forward" / "Drop" actions per ticket.

## Realtime
Drag results are saved instantly. Other planners see your moves live.
