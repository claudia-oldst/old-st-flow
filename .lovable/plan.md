## Add Estimate Health filters (red / orange / green) to ticket filters

Extend the filter popover so users can narrow the list to tickets whose actual hours have hit the warn (orange) or over-estimate (red) thresholds — per discipline and overall.

### Color rules (already in code via `healthRatio` in `src/lib/utils.ts`)
- **Green** (`good`): actual / estimate < 0.8
- **Orange** (`warn`): 0.8 ≤ actual / estimate < 1.0, OR hours logged against a zero estimate
- **Red** (`bad`): actual / estimate ≥ 1.0
- **None**: no estimate and no hours logged — excluded from any color filter

### UX
Add a new "Estimate health" section to `TicketsFilter` popover with three sub-groups:
- **Frontend** — Green / Orange / Red checkboxes (only evaluated for tickets with an FE assignee)
- **Backend** — Green / Orange / Red checkboxes (only evaluated for tickets with a BE assignee)
- **Project (shared)** — Green / Orange / Red checkboxes (only evaluated for Proj-type tickets using `current_project_estimate` vs `actual_project_hours`)

Each row shows a colored dot matching the existing `text-health-good / warn / bad` tokens so users see what each option means at a glance. Selecting multiple within a group is OR; across groups (FE/BE/Project) is OR as well — a ticket passes if any selected discipline matches one of its selected colors. This matches the existing FE/BE dev-status filter behavior.

The active count badge and "Clear all" already pick up new filter arrays automatically once added to `activeFilterCount` and `EMPTY_FILTERS`.

### Technical changes

**`src/features/tickets/TicketsFilter.tsx`**
1. Extend `TicketFilters` with:
   ```ts
   feHealth: ("good" | "warn" | "bad")[]
   beHealth: ("good" | "warn" | "bad")[]
   projectHealth: ("good" | "warn" | "bad")[]
   ```
2. Add them to `EMPTY_FILTERS` and include their lengths in `activeFilterCount`.
3. In `applyFilters`, import `healthRatio` from `@/lib/utils` and add three checks:
   - `feHealth`: only matches tickets with an FE assignee; compute `healthRatio(actual_frontend_hours, current_fe_estimate)` and require it to be in the selected set.
   - `beHealth`: same for BE.
   - `projectHealth`: only matches `ticket_type === "Proj"`; compute `healthRatio(actual_project_hours, current_project_estimate)`.
   - "none" results never match any selection (so a ticket with no estimate and no hours is filtered out when any health filter is active for that discipline).
4. Add a new `<FilterSection title="Estimate health — Frontend">` with three `FilterRow`s using colored dots:
   - Green → `hsl(var(--health-good))`
   - Orange → `hsl(var(--health-warn))`
   - Red → `hsl(var(--health-bad))`
   Repeat for Backend and Project.

No changes are needed in `ProjectTickets.tsx` (it just calls `applyFilters`) or in `TicketsList.tsx` (rendering unchanged). Existing persisted filter state remains compatible because new keys default to empty arrays via `{ ...EMPTY_FILTERS, ...stored }` patterns — if the stored state hydrates without spread defaults, we'll add a small normalize step when reading.

### Out of scope
- No DB/migration changes.
- No visual changes to the FE/BE hours cells themselves (still plain mono text). Coloring those cells can be a follow-up if desired.
