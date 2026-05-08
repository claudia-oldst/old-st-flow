# Refactor: Split files >250 lines

Goal: bring every non-generated, non-shadcn file under ~250 lines by extracting sub-components and hooks. **Zero behavior changes** — pure structural moves. Existing tests stay green; props on already-imported public components are preserved.

## Method (applied to every file)

1. Extract data + mutation logic into a `useXxx` hook in a sibling folder (`./<name>/useXxx.ts`).
2. Split JSX into `Header`, `Body`/`Form`, `Footer`/`Actions`, plus any obvious row/section components.
3. Keep the original file as the thin shell that wires hook → sub-components and re-exports the same public API.
4. Move file-local helper functions / constants into `./<name>/utils.ts` or `./<name>/constants.ts`.
5. Run `npm run lint && npm run test` after each file. No edits to imports outside the file being refactored except its new sibling files.

## Files & target decomposition

### Pages

- **`src/pages/Admin.tsx` (384)** → keep shell (tabs + auth gate). Extract:
  - `features/admin/team/TeamAdmin.tsx` (already partially there — move `TeamAdmin` out)
  - `features/admin/statuses/StatusesAdmin.tsx` (move `StatusesAdmin` out)
  - `features/admin/TabButton.tsx`
  - `features/admin/constants.ts` (PRESET_COLORS)

- **`src/pages/Projects.tsx` (373)** → keep route shell. Extract:
  - `features/project/list/ProjectsToolbar.tsx` (search + sort + status filter)
  - `features/project/list/ProjectCard.tsx` / `ProjectsGrid.tsx`
  - `features/project/list/useProjectsList.ts` (query + filtering + sort)
  - `lib/time.ts` for `relativeTime`, `hooks/useDebounced.ts`

### Health / portal

- **`features/health/ProjectHealth.tsx` (379)** → shell + tabs. Extract:
  - `health/overview/OverviewPanel.tsx`
  - `health/overview/Ring.tsx`, `ProfitabilityPill.tsx`
  - `health/useProjectHealth.ts` (aggregations)

- **`features/client-portal/ClientPortalEditor.tsx` (378)** → shell. Extract:
  - `client-portal/editor/EditorHeader.tsx` (publish + hash)
  - `client-portal/editor/IntroSection.tsx`
  - `client-portal/editor/EpicList.tsx` (already have `EpicSummaryEditor`)
  - `client-portal/editor/useClientPortalEditor.ts` (load/save snapshot)

- **`features/client-portal/PortalEpicTrend.tsx` (358)** →
  - `portal-epic-trend/TrendChart.tsx`
  - `portal-epic-trend/useEpicTrendData.ts` (build series, helpers `startOfDay`/`endOfDay` to `dateUtils.ts`)
  - shell renders header + chart

### Tickets

- **`features/tickets/TicketsFilter.tsx` (371)** → keep `applyFilters`/`activeFilterCount`/`EMPTY_FILTERS` exports. Extract:
  - `tickets/filters/FilterSection.tsx`, `FilterRow.tsx`
  - `tickets/filters/sections/AssigneeSection.tsx`, `EpicSection.tsx`, `TypeSection.tsx`, `StatusSection.tsx`, `HealthSection.tsx`
  - `tickets/filters/constants.ts` (TYPE_OPTS)

- **`features/tickets/BulkAssignDialog.tsx` (312)** → extract `Slot` to `bulk-assign/Slot.tsx`, `useBulkAssign.ts` for the mutation.

- **`features/tickets/BulkActionsBar.tsx` (296)** → split into `bulk-actions/StatusMenu.tsx`, `AssignMenu.tsx`, `MoreMenu.tsx`; shell composes them.

- **`features/tickets/TicketDetailSheet.tsx` (274)** → most subviews already exist in `detail/`. Extract `detail/useTicketDetailRealtime.ts` and `detail/TicketDetailBody.tsx`; shell only owns Sheet + close handling.

### Project dialogs

- **`features/project/ProjectSettingsDialog.tsx` (369)** →
  - `project/settings/SettingsForm.tsx`
  - `project/settings/DangerZone.tsx` (archive)
  - `project/settings/useProjectSettings.ts`

- **`features/project/ExportProjectDialog.tsx` (359)** →
  - `project/export/useExportProject.ts` (data fetch + CSV/XLSX build)
  - `project/export/ExportOptions.tsx` (date range, includes)
  - `project/export/utils.ts` (`endOfDay`, sheet builders)

### Estimates / change requests

- **`features/admin/StatusRulesAdmin.tsx` (361)** →
  - `admin/status-rules/RuleRow.tsx`
  - `admin/status-rules/RuleEditor.tsx`
  - `admin/status-rules/useStatusRules.ts`

- **`features/estimates/EpicChangeCard.tsx` (345)** →
  - `estimates/epic-change/EpicChangeHeader.tsx`
  - `estimates/epic-change/TicketRow.tsx`
  - `estimates/epic-change/DeltaSummary.tsx`

- **`features/change-requests/EpicCRCard.tsx` (328)** → mirror split: `Header.tsx`, `CRRow.tsx`, `CRSummary.tsx`.

- **`features/estimates/ProjectChangeRequests.tsx` (308)** →
  - `estimates/project-crs/Toolbar.tsx`
  - `estimates/project-crs/EpicGroup.tsx`
  - `estimates/project-crs/useProjectCRs.ts`

### Timelog

- **`features/timelog/StopGroupTimerDialog.tsx` (398)** →
  - `timelog/stop-group/useStopGroup.ts` (rows state + even-split + submit)
  - `timelog/stop-group/RowEditor.tsx`
  - `timelog/stop-group/SplitControls.tsx`
  - move `evenSplit` to `timelog/utils.ts`

- **`features/timelog/StartGroupTimerDialog.tsx` (356)** →
  - `timelog/start-group/Filters.tsx` (status + type)
  - `timelog/start-group/TicketPicker.tsx`
  - `timelog/start-group/useStartGroup.ts`

- **`features/timelog/LogTimeModal.tsx` (264)** →
  - `timelog/log-time/Form.tsx`
  - `timelog/log-time/useLogTime.ts`
  - drop the trailing `export { Square }` workaround if unused (check refs first; if used, leave a one-line re-export).

## Order of execution (smallest blast radius first)

1. Timelog dialogs (3 files) — internal, fully self-contained.
2. Bulk dialogs + filters (3 files) — only touch tickets feature.
3. Health, Portal trend, Editor (3 files) — leaf views.
4. Estimates / CR cards (3 files) — leaf views.
5. Project dialogs + Status rules (3 files).
6. Pages (Admin, Projects) last — they import from above and benefit from the new modules.

## Out of scope

- No prop renames, no public API changes, no Supabase queries reshuffled, no styling changes.
- `src/integrations/supabase/types.ts` (generated) and `src/components/ui/*` (shadcn) untouched.
- `TicketDetailSheet` won't go below 250 if Sheet boilerplate dominates — acceptable target ~180–220.

## Verification

- After each file: `npm run lint`, `npm run test`, manual smoke of the touched route in preview.
- Final pass: `wc -l` on the list above — all under ~260 except where noted.
