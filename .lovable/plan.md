## Roadmap tab refactor

Refactor the Roadmap tab so sprint blocks collapse to compact rows and the ticket table defaults to epic grouping with pool columns next to hours columns.

### Files

**Modified**
- `src/features/sprints/ForecastingCalendar.tsx` — replace the `SprintBlockCard` grid with a vertical `space-y-2` list of `SprintBlockRow`. Remove both the `"Sprint Blocks"` and `"Ticket Pooling"` section headings so the blocks and ticket table flow as one continuous page. Keep `appendNext` here (it creates new sprints at page level). Delete local components `SprintBlockCard`, `CapBar`, `CapRow`, `CapInput`, `AddMemberPopover` entirely — they have no other consumers.
- `src/features/sprints/SprintPoolingTable.tsx` — default `groupBy="epic"` for this view (its pool view key is separate from the main tickets tab). Pass `showMineToggle={false}`, `showViewToggle={false}`, `showGroupBy={true}`. Drop the `setFilterMine` wiring. Keep the FE/BE Pool filter selects in the `extras` slot unchanged.
- `src/features/tickets/list/TicketsList.tsx` — change `visibleCols` so `fe_pool`/`be_pool` (when supplied via `extraCols`) are inserted immediately after the `fe`/`be` hours columns instead of being appended at the end. Any other `extraCols` are still appended.

**New**
- `src/features/sprints/SprintBlockRow.tsx` — collapsible single-row sprint block.

**Untouched**
`dnd.ts`, `SprintWorkbench.tsx`, `PlanningPoolPanel.tsx`, `PlanningDevColumn.tsx`, `CarryoverReviewPanel.tsx`, `CapacityIndicator.tsx`, `useSprintBoard.ts`, `types.ts`, and everything in `src/features/tickets/` except `TicketsList.tsx`.

### `SprintBlockRow.tsx`

Props: `{ sprint, devMembers, projectId, isPMBA }`.

**Collapsed (default)** — single `flex items-center` row, `h-12`, hairline rounded:
- `ChevronRight` icon, rotates 90° when expanded.
- `"Sprint {n}"` label, then date range `MMM d → MMM d`.
- `"active"` badge if today is within `[start_date, end_date]`.
- `MemberAvatarStack` (size `xs`, max `4`) built from `sprint_capacities` joined to `devMembers`.
- Thin FE bar (only if `capFE > 0`): `"FE"` label, `h-1` progress, `{pooledFE}/{capFE}h`. Bar `bg-accent/70`, flips to `bg-primary` when over capacity. `pooledFE` is the **sprint-level** sum (across all FE devs) — same calculation as the deleted `SprintBlockCard`.
- Thin BE bar — same pattern, sprint-level.
- If `isPMBA`: `Trash2` delete button with confirm, same Supabase delete as the old `SprintBlockCard`.

**Expanded** — `border-t border-white/5` then per-dev rows:
- `MemberAvatar size="xs"`, name, FE/BE discipline chip.
- `CapacityIndicator used={pooledForDev} cap={capForDev}`.
  - **`pooledForDev` is a NEW per-dev calculation, not the sprint-level total.** Sum `current_fe_estimate` over tickets where `planned_sprint_fe_id === sprint.id` AND the ticket's FE assignee is this dev (for the FE row), or `current_be_estimate` over tickets where `planned_sprint_be_id === sprint.id` AND the BE assignee is this dev (for the BE row). When a dev has both disciplines, render one indicator per discipline using the matching per-discipline pooled value.
  - Do **not** pass the sprint-level `pooledFE`/`pooledBE` to per-dev indicators.
- If `isPMBA`: capacity hour `Input` (`h-6 w-16 text-xs text-right font-mono`), commit-on-blur upsert, plus `X` to remove the member.
- If `isPMBA`: inline `AddMemberPopover` recreated using `Popover` + `Command` (same logic as the deleted one).

All write logic (`updateCap`, `addMember`, `removeMember`, `updateDates`, delete) is moved from `ForecastingCalendar` into `SprintBlockRow`.

**Reused (no reimplementation)**
`MemberAvatar`/`MemberAvatarStack`, `CapacityIndicator`, shadcn `Button`/`Input`/`Popover`/`Command*`, `formatHours` and `cn` from `@/lib/utils`, `memberDisciplines` from `src/features/sprints/types.ts`, `useSprintCapacities`/`usePlannedSprintAssignments`/`useProjectMembers` from `useSprintBoard`, `useProjectTickets` from `@/features/tickets/useProjectTickets`, lucide icons `ChevronRight`/`Plus`/`Trash2`/`X`.

### `TicketsList.tsx` column order

```ts
const visibleCols: ColKey[] = useMemo(() => {
  const out: ColKey[] = ["id", "title"];
  if (groupBy !== "epic") out.push("epic");
  if (groupBy !== "version") out.push("version");
  if (groupBy !== "status") out.push("status");
  out.push("dev_status", "fe", "be");
  if (extraCols?.includes("fe_pool")) out.push("fe_pool");
  if (extraCols?.includes("be_pool")) out.push("be_pool");
  if (groupBy !== "assignee") out.push("assignees");
  extraCols?.forEach((c) => { if (!out.includes(c)) out.push(c); });
  return out;
}, [groupBy, extraCols]);
```

Affects both `SprintPoolingTable` and `ProjectTickets` (both pass `extraCols=["fe_pool","be_pool"]`) — desired in both places.

### Constraints

- No changes outside `src/features/sprints/` and `src/features/tickets/list/TicketsList.tsx`.
- No new Supabase queries — only existing hooks.
- Sprint-level Supabase writes in `SprintBlockRow` mirror the deleted `SprintBlockCard` exactly. The per-dev `pooledForDev` calculation is new and must not be confused with the sprint-level totals used in the collapsed bars.
- Roadmap remains list-only; no view toggle, no "My Tickets" toggle.
