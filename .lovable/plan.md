## Goal

Tighten the Sprint Planning **Pool** so it only surfaces tickets that are actually plannable:

1. Only tickets whose project status category is **`backlog`** or **`active`** are eligible.
2. Any ticket that already has a `sprint_tickets` row for the currently-selected **discipline** (FE or BE) — in *any* sprint — is excluded from the pool. It must be moved via carryover, not re-picked.
3. The roadmap plan (`planned_sprint_fe_id` / `planned_sprint_be_id`) is ignored for tickets that already have a commitment for that discipline.

Pool visibility today already excludes tickets in the current sprint's dev columns (`allDevTicketIds`, both disciplines); this widens the exclusion to *all sprints* for the selected discipline and adds the status-category gate.

## Changes

**File:** `src/features/sprints/PlanningPoolPanel.tsx`

- Pull all project sprint_tickets via `useProjectSprintTickets(projectId)` (already cached — same hook `usePoolData` uses) and build a `Set<string>` of ticket ids that have at least one `sprint_tickets` row where the row's `discipline` column equals the selected FE/BE toggle. Discipline is read from `sprint_tickets.discipline` — never inferred from assignee role — so fullstack tickets classify identically to the earlier fix.
- Pull statuses via `useStatuses()` and build a `Map<string, StatusCategory>` (`status_id → category`).
- Extend the existing `pool` filter in the `useMemo`:
  - Skip if `t.ticket_type === "Proj"` (unchanged).
  - Skip if `allDevTicketIds.has(t.id)` (unchanged — guards the current sprint's dev columns across both disciplines).
  - **New:** skip if the ticket is committed to any sprint for the current discipline (`committedForDiscipline.has(t.id)`).
  - **New:** skip if `t.status_id` is null (defensive — status_id is nullable pre-derivation) or its category is not `backlog` and not `active`.
  - Then apply the existing roadmap-selection filter.

No changes to drag/drop, carryover banner, or bulk actions — carryover remains the path to move a committed ticket forward.

## Out of scope

- Backend/schema changes.
- FE/BE toggle behavior, dev column rendering, or the `activeByTicket` chip logic in the tickets list / Gantt.
- Fullstack discipline routing (already fixed).
- How `planned_sprint_fe_id` / `planned_sprint_be_id` are stored — we just stop honoring them for tickets that already have a commit for that discipline.

## Verify

- Sprint Workbench → Planning, toggle **FE**: tickets in Dev Done / Done disappear from the pool.
- A ticket committed to Sprint 1 for FE no longer appears in the Sprint 2 FE pool. It only re-enters planning via Sprint 1's carryover action.
- The same ticket, if only FE is committed, still appears in the **BE** pool when the toggle flips.
- Tickets in Backlog/Active with no commitments continue to appear as before.
