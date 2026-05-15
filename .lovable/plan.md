# Sticky / top-accessible horizontal scroll for the Kanban board

## Problem
On the project Kanban (`ProjectBoard`), the columns row is wider than the viewport. The only horizontal scrollbar lives at the bottom of the page, so to move a card to a later status you have to scroll down to the bottom of the longest column just to reach the scrollbar.

## Goal
Let the user scroll the columns horizontally from the top of the board — without having to scroll down first. Column headers should also stay visible while scrolling vertically inside a tall column.

## Approach
Switch the columns container from "one big page-level horizontal scroller" to a layout where:

1. The horizontal scroll lives on a wrapper that's bounded to the visible viewport height, so its scrollbar is always reachable near the top of the screen.
2. Each column becomes internally vertically scrollable, so long columns no longer push the page (and the horizontal bar) downward.
3. The column header row stays sticky to the top of each column while its cards scroll.

This keeps the existing drag-and-drop, quick-add, and discipline-mode behaviour intact — it's a layout/overflow change only.

### Files to touch
- `src/features/board/ProjectBoard.tsx` — wrap the two `flex gap-3 overflow-x-auto` column rows (project mode + discipline mode) in a height-bounded scroll container. Use something like `max-h-[calc(100vh-220px)] overflow-x-auto overflow-y-hidden` so the horizontal scrollbar sits at the bottom of the visible board area, not the bottom of the page.
- `src/features/board/board/Columns.tsx` — for both `Column` and `DisciplineColumn`:
  - Give the column a bounded height (`h-full`) so it fills the scroll wrapper.
  - Make the header (`<div className="flex items-center justify-between px-1.5 pb-2 mb-2 hairline-b">`) `sticky top-0 z-10` with a glass background so it stays visible.
  - Make the cards container `flex-1 overflow-y-auto` so each column scrolls vertically inside itself.
  - Keep the `QuickAddRow` pinned at the bottom (sticky bottom) so PMBA users can always add without scrolling the column.

### Notes / edge cases
- DnD: `@dnd-kit` works fine inside scroll containers; no changes needed to `useBoardDnd`.
- Drag overlay: unaffected.
- Mobile / narrow viewports: the bounded height still works; on very short viewports the column body simply gets shorter.
- The page-level layout in `ProjectWorkspace` doesn't need changes.

## Out of scope
- No changes to list view, filters, card content, or business logic.
- No new sticky page-level toolbar.
