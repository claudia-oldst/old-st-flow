# Doneness ring: show remaining hours, not full estimates

## What changes
The outer doneness ring on the Health cards still adds up to the current estimate, but tickets that aren't finished only show their **remaining** hours in their status colour. Hours already logged on them fill in as progress.

For each ticket that isn't Done:
- Logged hours, capped at the ticket's current estimate, count as progress and show green, the same as Done.
- Remaining hours (estimate minus logged, never below 0) show in the ticket's status colour: yellow for In Progress, purple for For Integration, or the empty track for To Do.

Done tickets count their full current estimate as green, as they do now.

**Example:** a Backend ticket in progress with a 4h estimate and 3h logged shows 3h green and 1h yellow.

The hover box changes to match:
- In Progress, For Integration and To Do show remaining hours.
- Done becomes "Done / logged".

The two inner estimate rings stay exactly as they are.

## Technical details
- doneness.ts: add `actualFor(t, discipline)` using actual_frontend_hours, actual_backend_hours and actual_project_hours. For non-done tickets, `logged = min(actual, est)`; add `logged` to `done` and `est - logged` to the ticket's status. For the original basis, use the same formula.
- DonenessArcs.tsx: rename the Done label in the tip to "Done / logged".
- Extend doneness.test.ts with the 4h estimate / 3h logged case (expect in_progress 1 and done 3).
- Update docs/pages/project-health.md.
