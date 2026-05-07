
# Phase 2 — further reduce file sizes (zero functionality loss)

The previous refactor split off the obvious leaf components. Six files still hold tightly-coupled JSX + memos + handlers in a single body. This pass extracts the next layer — hooks for state/derivation, and presentational subcomponents for visually-distinct sections — while keeping every existing import path, hook order, dependency array, Tailwind class, Supabase call, realtime subscription, and toast string identical.

## Non-negotiable guardrails

- Original file paths stay as composition shells; no import-site changes anywhere in the app.
- Every `useState`, `useEffect`, `useMemo`, `useCallback` keeps the same dependencies and call order (preserves React hook identity & effect timing).
- No new dependencies. No prop renames. No new abstractions beyond moving code.
- After each split: read the resulting entry file, diff hook order against the original, verify the preview route renders with no console/runtime errors.
- `tsc` must pass with zero new errors.

## Targets

| File | Now | After (entry) | New siblings |
|---|---|---|---|
| `tickets/TicketDetailSheet.tsx` | 537 | ~180 | 4 |
| `tickets/TicketsList.tsx` | 595 | ~160 | 5 |
| `tickets/ProjectTickets.tsx` | 521 | ~170 | 3 |
| `board/ProjectBoard.tsx` | 334 | ~150 | 3 |
| `health/EstimateEvolution.tsx` | 403 | ~140 | 2 |
| `tickets/AddTicketsDialog.tsx` | 205 | ~110 | 1 |

## 1. TicketDetailSheet → existing `tickets/detail/`

- `useTicketEditor.ts` — title/feEst/beEst/projEst state, reset effect on `ticket` change, `handleSaveEdit` (incl. audit insert), `handleDelete`. Returns `{ editing, setEditing, title, setTitle, feEst, setFeEst, beEst, setBeEst, projEst, setProjEst, handleSaveEdit, handleDelete }`.
- `TicketDetailHeader.tsx` — the `<SheetHeader>` block (formatted_id chip, status pill, type/CR/epic/version chips, editable title input). Pure props.
- `StatusBlock.tsx` — the discipline + project-status card pair (lines 276–352), incl. `updateDiscipline` and `setProjectStatus` / `resetProjectStatusToAuto` (Supabase calls move with the JSX they belong to).
- `EstimatesPanel.tsx` — the "Estimates & actuals" section (lines 354–444): edit/view modes for Proj vs FE/BE, Stat tiles, project-contributors note, embedded `EstimateChangesPanel`.

Entry file becomes the Sheet shell + Tabs + dialogs (Assign / LogTime / RequestMoreTime) only.

## 2. TicketsList → existing `tickets/list/`

- `useTicketsSort.ts` — `sort` state + `loadSort` persistence effect + `toggleSort` + `sortTickets` comparator (depends on `statusOrder`).
- `useColumnResize.ts` — `widths` state, `loadWidths`/persistence effect, `dragRef`, `onResizeStart`, `widthFor`, `totalWidth`.
- `useTicketsGrouping.ts` — the giant `groups` memo (lines 183–284) covering none/status/type/epic/version/fe_status/be_status/assignee branches.
- `TicketsListRow.tsx` — `<tr>` body row + the `renderCell` switch (lines 288–416 + 542–584). Receives `t`, `visibleCols`, `selectionEnabled`, callbacks.
- `TicketsListHeader.tsx` — `<thead>` block including select-all checkbox + sortable column buttons + resize handles (lines 457–539).

Entry file becomes the outer `<TooltipProvider>` + `groups.map` shell. Re-exports `GroupBy` unchanged.

## 3. ProjectTickets → existing `tickets/project-tickets/`

- `useProjectTicketsView.ts` — `filteredTickets`, `visibleTickets`, selection state (`selectedIds`, `lastSelectedId`), the two cleanup effects, `toggleSelect`, `toggleSelectAll`, view/groupBy/filterMine/touched/search state, role-default effect.
- `ProjectTicketsToolbar.tsx` — the entire sticky top toolbar (lines 159–290): view toggle, My/All toggle (list view), group-by select, filters, card-display menu, search box, group-timer button, Add-ticket split button.
- `ImportCsvDialog.tsx` — the import `<Dialog>` with template button, drop-zone, preview table, footer (lines 343–503). Receives the `useTicketsCsvImport` returns + `open`/`onOpenChange`.

Entry file becomes: hook calls + toolbar + (board | empty | list) + `BulkActionsBar` + child dialogs.

## 4. ProjectBoard → existing `board/board/`

- `useDisciplineCards.ts` — `statusCategoryById`, `disciplineCards` memo, `byDisciplineStatus` memo. Returns both maps + `disciplineCards`.
- `useBoardDnd.ts` — `sensors`, `activeId`, `handleDragStart`, `handleDragEnd` (both project- and discipline-mode branches with their Supabase updates and `reload()`).
- `BoardToolbar.tsx` — mode toggle + filter-mine toggle + count line (lines 241–282).

Entry file becomes: data wiring + `byStatus` memo (project mode) + Toolbar + DndContext + columns + DragOverlay + `TicketDetailSheet`.

## 5. EstimateEvolution → existing `health/estimate-evolution/`

- `useEstimateEvolution.ts` — `projectStart`, `logs`, `loadStart`, `loadLogs`, both `useRealtimeReload` calls, `ticketEpic`, `ticketEffectiveMs`, `epicSnapshots`, `trendData`. Takes `{ projectId, asOf, selectedEpic }`. Returns `{ epicSnapshots, trendData }`.
- `EstimateTrendChart.tsx` — the recharts block (lines 336–398) plus the epic `<Select>` and the empty state. Pure props.

Entry file becomes: state (`asOf`, `selectedEpic`, `epicsOpen`) + header Popover + collapsible epics list + chart wrapper.

## 6. AddTicketsDialog → existing `tickets/add-dialog/`

- `useDraftRows.ts` — `drafts`, both reset effects, `members` load, `update`, `remove`, `addAnother`, `validDrafts`, `submit` (incl. payload build + Supabase insert + assignee insert + toasts).

Entry file becomes: dialog shell + drafts.map(DraftRow) + footer.

## Verification per file

After each split:

1. Open the resulting entry file and confirm the JSX tree, hook order, and effect dependencies match the original line-for-line.
2. Open the preview route exercising the component (Project workspace tickets/board/health, ticket detail sheet, add dialog) and confirm no console or runtime errors.
3. Spot-check one realtime path (e.g. log time → estimate evolution updates) to confirm subscriptions still fire.

## Out of scope

Performance, caching, pagination, error-handling, accessibility passes, and tests — separate work.
