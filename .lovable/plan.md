## Goal

Surface **original** estimates alongside current estimates in the three top cards on the Project Health board (Frontend, Backend, Profitability). Each ring gets a second, inner arc showing the original-estimate burn ratio, plus an "Original" hours label.

## Visual

```text
┌──────────── Frontend ─────────────┐
│   ╭───────╮                       │
│  ╱  outer  ╲   Actual    87.0 h   │
│ │ ╭─────╮ │   Current   120.0 h   │
│ │ │inner│ │   Original  100.0 h   │
│ │ ╰─────╯ │                       │
│  ╲       ╱   72% burned (curr)    │
│   ╰─────╯    87% burned (orig)    │
└───────────────────────────────────┘
```

- **Outer ring**: actual vs **current** estimate (existing behavior, unchanged).
- **Inner ring**: actual vs **original** estimate, drawn at a smaller radius with the same health-color logic but slightly thinner stroke and reduced opacity so the outer ring still reads as primary.
- Center label keeps the current % (primary metric); a small `vs orig N%` chip sits under "burned".
- Right-hand stats list adds an **Original** row under Estimate.

Profitability card (no ring today) gets:
- A new "Total original" stat next to the existing Total est. / Total actual grid.
- A secondary percentage `N% of original` under the main `% of estimate burned` line.

## Files to edit

- `src/features/health/ProjectHealth.tsx`
  - Sum `original_fe_estimate` / `original_be_estimate` in the `totals` memo (add `feOrig`, `beOrig`).
  - Pass `original` to each `<Ring />` and to the profitability block.
  - Update `Ring` component:
    - Accept `original: number` prop.
    - Compute `origRatio`, `origPct`, and a separate health color.
    - Render a second `<circle>` at `r = 40` with `strokeWidth="6"` and `opacity-60`.
    - Add an "Original" line in the stat list and a small `vs orig N%` caption under "burned".
  - Profitability card: add `totalOrig = feOrig + beOrig`, render a "Total original" cell in the grid and a secondary `vs orig N%` line.

## Technical details

- All values come from the already-loaded `tickets` array (`original_fe_estimate`, `original_be_estimate` are present on the typed ticket).
- Reuse `healthRatio()` and `formatHours()` for consistency.
- Inner ring math mirrors outer ring: `dash = (min(actual/original, 1) * 100 / 100) * (2π * 40)`.
- When `original === 0`, render the inner ring as the empty track only and show `—` for the Original stat.
- No DB changes, no new dependencies, no new components.
