# Show epics with tickets, hide only ticket-less epics

## Correction to the last change

The previous fix dropped any epic row with no sprint segments. That went too far: an epic that has tickets but none scheduled into a sprint now disappears from the Gantt charts. Only epics with zero tickets should be hidden.

## The change

In the shared Gantt row builder:

- Seed epic rows from the ticket list instead of from the full epic list — an epic gets a row if at least one ticket carries that epic, whether or not the ticket is committed or planned into a sprint.
- Remove the "skip rows with no segments" rule added last time, so an epic with unscheduled tickets still renders (as a row with no bar, using the existing fallback dates).

Result across the sprint tab Gantt, the client portal editor Timeline preview, and the public portal Timeline: epics with tickets always appear; epics with no tickets never do.

## Technical detail

- `src/features/sprints/gantt/buildGanttRows.ts`
  - Before the pre-seeding loop, build a set of epic IDs present on the incoming tickets.
  - Pre-seed `epicSegments` only for epics in that set (keeping the existing name lookup and the "No epic" bucket behaviour).
  - Delete the `if (segments.length === 0) return;` guard in the row assembly loop.
- `src/features/client-portal/PortalTimeline.tsx` — its `epicIdsWithTickets` filter now matches the builder's behaviour; leave it as is.
- No database or RPC changes.
