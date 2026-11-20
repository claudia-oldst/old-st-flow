# Gantt: show every plan and commitment per sprint

## What changes
- A ticket now appears in **every sprint** where it has a commitment, not only its latest one.
- A ticket's planned sprint shows too, even if the ticket is also committed elsewhere.
- If a ticket is both planned and committed in the same sprint, it counts once, as committed.
- Each sprint bar still shows its committed (green) and planned (gold) counts plus the To Do → Done status split.
- An epic's bar now runs from its first planned or committed sprint to its last one.
- The client portal timeline follows the same rule automatically, because both use the same builder.

## What does not change
- No database changes and no Slack messages.
- Roadmap, Sprints tab, capacity and the FE/BE toggle stay as they are.

## Technical details
- `src/features/sprints/gantt/buildGanttRows.ts`: replace the "latest commitment wins" loop with a per-ticket set of sprint ids for the selected discipline: all commitments (committed=true) plus `planned_sprint_{fe,be}_id` when not already committed there (committed=false). Increment segments for each entry.
- Add or update a unit test: a ticket committed to Sprint 1 and Sprint 3 and planned for Sprint 4 appears in all three segments (2 committed, 1 planned); planned + committed in the same sprint counts once as committed.
- Update the `AGENTS.md`/help text line that says "latest commitment".
