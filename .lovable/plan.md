# Health tab redesign

Replace the member capacity table with a weekly burn rate sparkline and an epic risk table that visualizes doneness vs estimate burn.

## Files

**Delete**
- `src/features/health/overview/HealthSummaryRow.tsx`
- `src/features/health/overview/useProjectHealth.ts`

**Create**
- `src/features/health/overview/WeeklyBurnPanel.tsx`
- `src/features/health/overview/EpicRiskTable.tsx`

**Modify**
- `src/features/health/ProjectHealth.tsx`

`Ring`, `ProfitabilityPill`, `EstimateEvolution`, and everything under `estimate-evolution/` stay untouched.

## `ProjectHealth.tsx` changes

Remove:
- `useProjectHealth` import + call (members/weekHours/ticketsByMember/remainingByMember)
- `range`/`setRange` state, `DateRange` type, `defaultRange` import
- `HealthSummaryRow` import + render
- `DateRangeControl` import (only used by the deleted row)

Keep as-is: `useProjectTickets`, `useStatuses`, `useProjectRole`, `useProjectEpics`, `useEpicDiscounts`, `projectStart` query, `totals`, `discountTotals`, three `Ring`s, discounts block, `EstimateEvolution`, profitability + unassigned calcs.

Add imports: `ProfitabilityPill` from `./overview/ProfitabilityPill`, `AlertTriangle` from `lucide-react`, the two new panels.

New layout order:
1. Hour burn header + Create discount button (unchanged)
2. 4-col grid: 3 `Ring`s + `<WeeklyBurnPanel projectId tickets />`
3. Discounts block (conditional, unchanged)
4. 2-col grid: profitability block + unassigned block, inlined (markup lifted verbatim from `HealthSummaryRow`, using `ProfitabilityPill state={overall}`, `formatHours`, `AlertTriangle`)
5. `<EpicRiskTable projectId tickets statuses epics />`
6. `EstimateEvolution` (unchanged)

## `WeeklyBurnPanel.tsx`

Props: `{ projectId: string; tickets: TicketRow[] }`.

TanStack Query, key `["weeklyBurn", projectId]`: select `logged_at, hours` from `time_logs` where `ticket_id IN tickets.map(t=>t.id)`. Skip when no tickets.

`useRealtimeInvalidate([{ table: "time_logs" }], queryKey)` for liveness.

`useMemo`: bucket logs by Monday of week (`date-fns` `startOfISOWeek`), produce last 8 complete ISO weeks + current partial week (9 bars). Compute `maxHours`, `currentWeekHours`, and `trend = round((currentWeek - priorWeek) / priorWeek * 100)` (0 when prior is 0).

Render: panel matching `Ring` card height with header "Weekly burn rate", trend badge (green `health-good` when ≥0, amber `health-warn` otherwise, `↑`/`↓`), row of 9 bars (`flex items-end gap-1 h-16`), each bar `height: max(4%, hours/max*100%)`, current week tinted `bg-primary`, others `bg-primary/40`. Footer: "8 wks ago" left, `formatHours(currentWeekHours) + " this week"` right.

## `EpicRiskTable.tsx`

Props: `{ projectId: string; tickets: TicketRow[]; statuses: Status[]; epics: { id: number; epic_name: string | null }[] }`. No new Supabase calls.

Build `Map<statusId, category>` from `statuses` (categories: `backlog`, `active`, `dev done`, `done`).

For each epic, filter tickets where `t.epic_id === e.id` AND not (CR ticket with `cr_approval !== "approved"`). Compute counts per category, `currentEst = sum(current_fe_estimate + current_be_estimate + current_project_estimate)`, `actualHours = sum(actual_frontend_hours + actual_backend_hours + actual_project_hours)`, `burnPct = min(150, actualHours/currentEst*100)`, `progressPct = (done+devDone)/total*100`.

Risk:
```ts
const effectiveProgress = ((done + devDone + active * 0.3) / total) * 100;
const burnAhead = burnPct - effectiveProgress;
if (burnAhead > 35) return "at_risk";
if (burnAhead > 15 || (backlog/total > 0.7 && burnPct > 25)) return "watch";
return "healthy";
```

Keep rows with `total > 0 && currentEst > 0`. Sort: `at_risk` → `watch` → `healthy`, then `burnPct` desc.

Render:
- Header row: title "Epic risk — doneness vs estimate burn" + legend swatches. Legend colour mapping (so primary doesn't clash with the gold/coral accent):
  - Done → `bg-health-good`
  - Dev done → `bg-health-good/50` (lighter shade of the "finished" hue so it reads as "nearly done")
  - Active → `bg-health-warn`
  - Backlog → `bg-dimmer`
  - separator
  - Burned → `bg-health-bad`
- Column header grid `[2fr,3fr,3fr,auto]`: Epic / Doneness / Estimate burn / Risk
- Per row:
  - Epic name (truncate)
  - Doneness: stacked 4-segment horizontal bar using the same tokens as the legend (done/devDone/active widths as % of total; backlog fills remainder), captions below with counts
  - Burn: full-width track with inner bar width `min(100, burnPct)%`, color = `health-bad` if `burnPct > 100`, `health-warn` if `> 80`, else `health-good`; caption `"{round(burnPct)}% burned · {formatHours(actual)} / {formatHours(est)}"`
  - Risk pill: inlined `<span>` badge (not `ProfitabilityPill`, which only accepts health state strings and would not render the right labels). Tokens: `at_risk` → `bg-health-bad/15 text-health-bad`, `watch` → `bg-health-warn/15 text-health-warn`, `healthy` → `bg-health-good/15 text-health-good`. Labels: "At risk" / "Watch" / "Healthy".

## Constraints recap

- One new fetch only (`time_logs` in `WeeklyBurnPanel`).
- Reuse `formatHours`, `healthRatio`, semantic tokens; no hardcoded colors.
- `useEstimateEvolution` and `estimate-evolution/` untouched.
