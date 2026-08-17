# Hide empty epics in the portal preview Timeline

## What's happening

Epic 231 ("AWS" on Project Amber) has 0 tickets, but it still appears as a row in the Timeline tab of the in-app client portal editor.

Cause (confirmed): the shared Gantt row builder pre-seeds one row for **every** epic in the project before it looks at tickets. Epics that never get a ticket keep that seeded row and render as an empty line. The public portal Timeline hides them with an extra filter of its own; the in-app preview uses the internal sprint Gantt directly, which has no such filter.

## The change

Drop rows that have no sprint segments at the source, in the row builder, so every Gantt surface behaves the same:

- Sprint tab Gantt
- Client portal editor Timeline preview
- Public client portal Timeline

An epic with no tickets scheduled into any sprint contributes nothing to the chart, so removing the empty row is purely visual cleanup.

## Technical detail

- `src/features/sprints/gantt/buildGanttRows.ts` — when assembling the final `rows` array, skip buckets whose `segments` array is empty.
- `src/features/client-portal/PortalTimeline.tsx` — the existing `epicIdsWithTickets` filter becomes redundant; it can stay as a harmless safety net or be removed for clarity.
- No database or RPC changes needed.
