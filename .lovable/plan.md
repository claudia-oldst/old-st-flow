# Refactor: split oversized feature files (zero functionality loss)

Pure structural decomposition of six monolithic files. **No behaviour, styling, data flow, or public API changes.** Code is moved verbatim; only module boundaries change.

## Non-negotiable guardrails

- All existing import paths keep working via re-export shims at the original file locations.
- Every `useState`, `useEffect`, `useMemo`, Supabase call, realtime subscription, toast, keyboard handler, and Tailwind class is preserved exactly.
- No new dependencies. No renamed props. No reordered hook calls (preserves React identity & effect order).
- After each file split, the harness `tsc` pass must succeed with zero new errors.
- I will diff each extracted block against the original before moving to the next file.

## Targets

| File | Lines | Split into |
|---|---|---|
| `src/features/tickets/TicketDetailSheet.tsx` | 988 | 9 files under `tickets/detail/` |
| `src/features/tickets/ProjectTickets.tsx` | 736 | 4 files under `tickets/project-tickets/` |
| `src/features/tickets/TicketsList.tsx` | 667 | 5 files under `tickets/list/` |
| `src/features/tickets/AddTicketsDialog.tsx` | 566 | 5 files under `tickets/add-dialog/` |
| `src/features/board/ProjectBoard.tsx` | 536 | 5 files under `board/board/` |
| `src/features/health/EstimateEvolution.tsx` | 487 | 4 files under `health/estimate-evolution/` |

## 1. TicketDetailSheet → `tickets/detail/`

- `TicketDetailSheet.tsx` — sheet shell, tab wiring, top-level state
- `useTicketEditor.ts` — title/feEst/beEst/projEst editing state, save/cancel, reset effect
- `AcceptanceCriteria.tsx` — incl. AI-generation flow (default-tab logic preserved)
- `DisciplineRow.tsx` (+ `DISCIPLINE_OPTIONS`)
- `AssigneeBlock.tsx`
- `Stat.tsx`
- `MarkdownView.tsx`
- `TimeLogsPanel.tsx` — paginated logs
- `EstimateChangesPanel.tsx` — change history + "show all" toggle

Original file becomes: `export { TicketDetailSheet } from "./detail/TicketDetailSheet";`

## 2. ProjectTickets → `tickets/project-tickets/`

- `ProjectTickets.tsx` — page composition + dialogs
- `useProjectTicketsView.ts` — filters, group-by, search, selection, derived rows
- `useTicketsCsvImport.ts` — CSV parsing + bulk insert
- `parseDiscipline.ts`

## 3. TicketsList → `tickets/list/`

- `TicketsList.tsx` — render
- `columns.ts` — `COLS`, `ColKey`, `ColDef`, `SORTABLE`, `DISC_ORDER`, `DISC_OPTS`, `STORAGE_KEY`, `SORT_STORAGE_KEY`
- `useColumnWidths.ts` — `loadWidths` + resize state + persistence
- `useTicketsSort.ts` — `loadSort` + sort state + persistence + comparator
- `useTicketsGrouping.ts`

`GroupBy` re-exported from shim.

## 4. AddTicketsDialog → `tickets/add-dialog/`

- `AddTicketsDialog.tsx` — dialog shell + submit
- `useDraftRows.ts` — draft list state, add/remove/update, validation
- `DraftRow.tsx`
- `AssignPopover.tsx`
- `SlotChips.tsx`

## 5. ProjectBoard → `board/board/`

- `ProjectBoard.tsx` — layout + DnD context
- `constants.ts` — `DISCIPLINE_STATUSES`, `CATEGORY_TO_DISCIPLINE`, `DISCIPLINE_TO_CATEGORY`
- `Column.tsx` (+ `DisciplineColumn`)
- `DraggableCard.tsx` (+ `DraggableDisciplineCard`)
- `useBoardDnd.ts` — drag handlers + status mutations

## 6. EstimateEvolution → `health/estimate-evolution/`

- `EstimateEvolution.tsx` — layout, controls, chart
- `useEstimateEvolution.ts` — `loadStart`, `loadLogs`, `epicSnapshots`, `trendData`, `ticketEffectiveMs` (preserves all `useRealtimeReload` subscriptions)
- `EpicRow.tsx` (+ `BarRow`)
- `dateUtils.ts` — `startOfDay`, `endOfDay`, `NO_EPIC_KEY`, `ALL_EPICS_KEY`

## Verification per file

After each split: read the new entry file, confirm the JSX tree, hook order, and effect dependencies match the original line-for-line. Open the preview route that exercises the component and confirm no console/runtime errors.

## Out of scope

Performance, caching, pagination, error-handling, and tests from prior audits — separate task.
