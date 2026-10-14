# Doneness ring: show remaining hours, not full estimates

## What changes
The outer doneness ring on the Health cards still adds up to the current estimate. Every ticket, including Done ones, is now split the same way:
- **Logged hours**, capped at the ticket's current estimate, count as progress and show green.
- **Remaining hours** (estimate minus logged, never below 0) show in the ticket's status colour: yellow for In Progress, purple for For Integration, green for Done, or the empty track for To Do.

**Example:** a Backend ticket in progress with a 4h estimate and 3h logged shows 3h green and 1h yellow. A Done ticket stays fully green whether it came in under its estimate or not.

The hover box changes to match: Done becomes "Done / logged", and In Progress, For Integration and To Do show remaining hours.

The two inner estimate rings stay exactly as they are.

## Technical details
- doneness.ts: add `actualFor(t, discipline)` using actual_frontend_hours, actual_backend_hours and actual_project_hours. For every ticket, `logged = min(actual, est)`; add `logged` to `done` and `est - logged` to the ticket's status. For the original basis, use the same formula.
- DonenessArcs.tsx: rename the Done label in the tip to "Done / logged".
- Extend doneness.test.ts with the 4h estimate / 3h logged case (expect in_progress 1 and done 3).
- Update docs/pages/project-health.md.
