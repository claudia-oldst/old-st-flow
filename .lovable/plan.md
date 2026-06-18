## Client portal improvements — epic table, CR tab, Timeline tab

### Files

**New**
- `src/features/client-portal/PortalEpicTable.tsx`

**Modified**
- `src/features/client-portal/PortalView.tsx`
- `src/features/client-portal/PortalChangeRequests.tsx`
- `src/features/client-portal/editor/PreviewChangeRequests.tsx`
- `src/pages/ClientPortalPublic.tsx`
- `src/features/client-portal/ClientPortalEditor.tsx`
- `src/features/sprints/SprintGantt.tsx` (add optional `hideExport?: boolean` only)
- `src/features/change-requests/EpicCRCard.tsx` (add optional `ratePerHour?: number` — confirmed)

**Untouched**
- `GanttGrid.tsx`, `GanttBar.tsx`, `useGanttData.ts`, `useSprintBoard.ts`
- `PortalEpicTrend.tsx` (left in repo but no longer rendered), `PortalTrendChart.tsx`
- `EpicSummaryEditor.tsx`, `PortalToolbar.tsx`
- Everything else in `src/features/sprints/`

---

### Change 1 — PortalView + new PortalEpicTable

`PortalView.tsx`: remove the `<PortalEpicTrend …>` block (lines 106-121) and the entire "Estimate Change Detail" IIFE (lines 123-193). Replace with a single `<PortalEpicTable epics={epics} projectId={project.id} cutoff={project.cutoff} ratePerHour={project.rate_per_hour} showRate={showRate} discounts={discounts} />`.

`PortalEpicTable.tsx`:
1. **Call `usePortalEpicTrendData` exactly once at this component level.** Build `cutoffMs = new Date(cutoff).getTime()`. Memoize the aggregate series via `buildEpicTrendSeries({ tickets, changes, logs, projectStart, cutoffMs, ticketFilter: () => true, discounts })`. Per-row expanded panels receive `tickets/changes/logs/projectStart/ticketEpic` through the parent closure (not as a child hook call) and compute their own filtered series via `buildEpicTrendSeries({ …, ticketFilter: (tid) => ticketEpic.get(tid) === e.id, discounts: discounts.filter(d => d.epic_id === e.id) })`. No row-level Supabase calls.
2. Top: aggregate `<PortalTrendChart data={aggregated} />` in a `glass rounded-2xl p-5` card with the existing "Estimate trend over time" header.
3. Epic progress table — `glass rounded-2xl overflow-hidden`, header `Epic · Progress · Hours (cur/orig) · Change · ▸`. For each `e.total_tickets > 0`:
   - left dot `w-1.5 h-1.5 rounded-full`: `bg-health-warn` (+delta), `bg-health-good` (−delta), empty spacer (no delta)
   - epic name `text-sm font-medium truncate` (dim if no delta)
   - segmented progress bar `h-1.5 rounded-full` (done green + in_progress blue) + `text-xs text-dimmer` counts subtitle
   - hours `text-xs font-mono text-dim`: `{formatHours(current)} / {formatHours(original)}`
   - change badge: `badge-warn` +, `badge-good` −, `—` dimmer otherwise
   - chevron only when delta ≠ 0; rows with delta are clickable to toggle expansion; no-delta rows are inert
   - expanded panel: `border-l-2` (amber+/green−), `pl-4 pr-3 py-3 border-b border-white/5`:
     - if `pmba_text` non-empty: `rounded-xl bg-white/[0.03] hairline p-3 text-sm leading-relaxed whitespace-pre-wrap`
     - mini `PortalTrendChart` for this epic (uses shared data from parent closure)
     - if `showRate && ratePerHour > 0`: cost line using `e.actual_hours` minus the discount sum for that epic (same math as the removed block)
4. Empty state: centered "No epics yet." when no epic has tickets.

---

### Change 2 — PortalChangeRequests

- Replace the `MultiSelectFilter` (line 150) with three inline pills: **Pending (n)** / **Approved (n)** / **All (n)**. Counts derived from `crTickets`. Active pill `bg-foreground text-background`; inactive `text-dim hover:text-foreground hairline px-3 py-1.5 rounded-lg text-xs`. Clicking sets `statusFilter` to `["pending"]`, `["approved"]`, or `["pending","approved","rejected"]`. Default changes from `["pending","approved"]` to `["pending"]`.
- Add `ratePerHour: number` prop. Plumb through:
  - `ClientPortalPublic.tsx` passes `data.project.rate_per_hour`.
  - `PreviewChangeRequests.tsx` extends the existing `select("acronym")` to **`select("acronym, rate_per_hour")`** (one query, not two) and passes the value through.
- Pass `ratePerHour` to each `<EpicCRCard>`. `EpicCRCard` gains the **optional** `ratePerHour?: number` prop and, when defined, renders a `Cost est.` column showing `formatGBP((current_fe_estimate + current_be_estimate) * ratePerHour)`. Internal CR pages don't pass it, so the column is absent there — additive, zero touch to existing call sites.
- Dim approved-only groups: when `g.filtered.length > 0 && g.filtered.every(t => t.cr_approval === "approved")`, wrap `<EpicCRCard>` in a div with `opacity-60`.

---

### Change 3 — Timeline (Gantt) tab

`SprintGantt.tsx`: add `hideExport?: boolean` to `Props`. When true, skip the Export PNG `<Button>`. Nothing else changes.

`ClientPortalPublic.tsx`:
- Import `useSprints` from `@/features/sprints/useSprintBoard`, `SprintGantt` from `@/features/sprints/SprintGantt`.
- `const { data: sprints = [] } = useSprints(data?.project?.id);`
- `TabsList` becomes `grid-cols-3`; add `<TabsTrigger value="timeline">Timeline</TabsTrigger>`.
- `<TabsContent value="timeline">`: render `<SprintGantt projectId={data.project.id} sprints={sprints} hideExport />` when `sprints.length > 0`, else centered "No sprint timeline available yet."
- Pass `ratePerHour={data.project.rate_per_hour}` to `<PortalChangeRequests>`.

`ClientPortalEditor.tsx`:
- `TabsList` becomes `grid-cols-3`; add `<TabsTrigger value="timeline">Timeline</TabsTrigger>`.
- Add `<TabsContent value="timeline">` rendering a small inline `SprintGanttPreview` component (defined in the same file) that calls `useSprints(id)` and returns `<SprintGantt projectId={id} sprints={sprints} hideExport />`.

RLS on `sprints` already allows anon read for published portals — no migration needed.
