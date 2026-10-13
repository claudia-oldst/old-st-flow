# Health rings: restore estimate rings, add a separate Doneness ring

## What changes
On the Frontend, Backend and Project cards on the Health page:

- **Middle ring (Current)** and **inner ring (Original)** go back to how they were in your first screenshot. They show hours logged as a share of the current and original estimates, in the same colours as before.
- **A new outer ring** is added just outside them. It shows doneness only:
  - It fills clockwise from 12 o'clock: In Progress (yellow), then For Integration (purple), then Done (green).
  - Whatever is left of the ring is To Do, shown as the faint empty track.
  - It's sized by current estimate hours.
- Hovering the outer ring shows the hours and % for each status, including To Do. The two inner rings won't have a hover box.
- The ring area grows a little so all three rings fit, and the Current % and Original % text stays in the middle.

```text
   outer  : doneness (thin, status colours)
   middle : Current estimate burn (as before)
   inner  : Original estimate burn (as before)
```

## Technical details
- Ring.tsx: always render the original burn arcs for r=56 and r=30; add `<DonenessArcs>` at r≈66 with strokeWidth≈6, and widen the viewBox (about 0 0 160 160, centre 80) so it isn't clipped. Replace the `donenessOriginal` prop with a single `doneness` prop.
- DonenessArcs.tsx: take a centre (cx/cy) prop; keep the hover-tooltip mechanism.
- ProjectHealth.tsx: pass only the current-basis doneness. donenessHours keeps its `basis` param, and its tests stay as they are.
- Update docs/pages/project-health.md.
