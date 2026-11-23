# Acceptance Criteria filter

Add an "Acceptance criteria" filter with two options — **Populated** and **None** (empty or only blank lines) — to the ticket filter panel used on:
- Tickets list
- Feedback (Thalamus) tab
- Sprints Roadmap

Selecting both (or neither) shows all tickets. The choice behaves like the other filters (saved with the view, counts in the active-filter badge, cleared by "Clear").

## Database change (needs your OK)
Ticket lists deliberately don't download the criteria text, to stay fast. To filter without downloading it, the ticket list query will also return a small yes/no flag "has acceptance criteria" per ticket. Read-only change to the list query only: no table changes, no data changes, no notifications.

## Technical details
- Update `list_project_tickets` (and the Feedback list RPC if separate) to add `has_acceptance_criteria boolean` = `coalesce(btrim(acceptance_criteria), '') <> ''`.
- Map it in `useProjectTickets.ts` normaliser; add `acceptanceCriteria: ('populated'|'none')[]` to filter state, a section in `FilterSections.tsx`, and matching logic in `applyFilters.ts`; Roadmap and Feedback already use the shared filter, so they pick it up (wire into `RoadmapToolbar` if it uses its own set).
- After saving criteria in the drawer, update the flag in the cached row so the filter reacts without reload.
- Tests in `applyFilters.test.ts`: Populated keeps only tickets with criteria; None keeps only empty/whitespace ones.
