## Goal

Let the user resize the Sprint Planning **Pool** panel horizontally to see more detail (title, epic chip, hours).

## Approach

Replace the fixed `w-96` on `PlanningPoolPanel` with a user-controlled width, drag-resized via a handle on the panel's right edge. Persist per user (localStorage) so it survives navigation.

### Changes

1. **`src/features/sprints/PlanningPoolPanel.tsx`**
   - New `width` prop (number, px) + `onResize(width)` callback. Replace `w-96` with inline `style={{ width }}`.
   - Add a 4px-wide drag handle absolutely positioned on the right edge (`cursor-col-resize`, subtle hover highlight using existing tokens). Mousedown starts a window-level `mousemove`/`mouseup` drag that computes new width from the panel's left offset and clamps to `[320, 900]` px.
   - Add `min-w-0` so the inner list truncates cleanly at all widths.

2. **`src/features/sprints/SprintWorkbench.tsx`**
   - Store `poolWidth` via `usePersistentState<number>("sprints:poolWidth", 384)` (384 = current `w-96`).
   - Pass `width` and `onResize` to `PlanningPoolPanel`.
   - Dev column strip stays `flex-1` and reflows automatically as the pool grows.

3. **No changes** to `PoolRow`, `PoolFilterBar`, data hooks, or DB. Row layout already uses flex, so extra width naturally expands the title column.

### Out of scope

- Vertical resize, collapsing the pool, or resizing individual dev columns.
- Responsive/mobile behavior — this is a desktop planning view.

## Verification

- Drag the right edge of the Pool → panel widens/narrows smoothly; dev columns reflow.
- Reload the page → pool width is restored.
- At max width, ticket titles and epic chips have more room; at min width, layout still readable.
