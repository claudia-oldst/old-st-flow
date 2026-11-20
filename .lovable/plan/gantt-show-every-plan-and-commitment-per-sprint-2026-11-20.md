# Gantt: show every plan and commitment per sprint

## What changes
- A ticket now appears in **every sprint** where it has a commitment, not only its latest one.
- A ticket's planned sprint shows too, even if the ticket is also committed elsewhere.
- Planned and Committed are one status per ticket, per sprint, per discipline (FE and BE separately), so a ticket counts once in each sprint where it is planned or committed.
- Each sprint bar still shows its committed (green) and planned (gold) counts plus the To Do → Done status split.
- The chart simply shows, for each sprint, the status of the epic's tickets in that sprint. There is no single bar running from one sprint to another.
- The client portal timeline follows the same rule automatically, because both use the same builder.

## What does not change
- No database changes and no Slack messages.
- Roadmap, Sprints tab, capacity and the FE/BE toggle stay as they are.

## Technical details
- `src/features/sprints/gantt/buildGanttRows.ts`: replace the "latest commitment wins" loop with a per-ticket set of sprint ids for the selected discipline: all commitments (committed=true) plus `planned_sprint_{fe,be}_id` (committed=false). Each ticket/sprint/discipline has one status, so count it once per sprint. Render separate per-sprint segments only.
- Add or update a unit test: a ticket committed to Sprint 1 and Sprint 3 and planned for Sprint 4 appears in all three segments (2 committed, 1 planned).
- Update the `AGENTS.md`/help text line that says "latest commitment".
