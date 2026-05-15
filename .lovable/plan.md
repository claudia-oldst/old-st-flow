# Reachable horizontal scroll for the Kanban columns

## Problem
On the project Kanban (`ProjectBoard`), the columns row is wider than the viewport. The horizontal scrollbar only appears at the bottom of the entire columns block — which is below the longest column. To scroll right and *see* later status columns, you currently have to scroll the page all the way down first to reach the scrollbar.

## Goal
Let the user scroll the columns row horizontally without first scrolling the page down. The scrollbar (and the scroll gesture) should be reachable while the top of the board is in view.

## Approach
Bound the height of the horizontal scroll container so its scrollbar sits inside the visible viewport instead of below the tallest column.

In `src/features/board/ProjectBoard.tsx`, the two column rows currently use:

```
<div className="flex gap-3 overflow-x-auto pb-4">
```

Change them to a height-bounded scroller, e.g.:

```
<div className="overflow-x-auto pb-3 max-h-[calc(100vh-220px)]">
  <div className="flex gap-3 min-w-max">…columns…</div>
</div>
```

Effects:
- The horizontal scrollbar appears at the bottom of the visible board area, reachable without scrolling the page.
- Trackpad / shift-wheel horizontal scroll works from anywhere over the columns.
- Long columns scroll *within* the bounded area instead of pushing the scrollbar off-screen.
- No changes to drag-and-drop, column internals, quick-add, or business logic.

## Files
- `src/features/board/ProjectBoard.tsx` — wrap both the project-mode and discipline-mode column rows in the bounded horizontal scroller.

## Out of scope
- Sticky column headers, per-column vertical scroll, list view, filters, card content.
