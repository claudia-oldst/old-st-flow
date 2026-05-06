## Goal
Eliminate the need to refresh by adding `postgres_changes` subscriptions everywhere data is loaded (the previous migration enabled the publication; many hooks/pages just don't subscribe).

## Step 1 — Shared helper
Add `src/hooks/useRealtimeReload.ts` exporting `useRealtimeReload(tables, onChange, enabled)`. Each entry: `{ table, filter?, event? }`. Auto-named channel + cleanup. Used by all callers below for consistency.

## Step 2 — Add subscriptions

| File | Tables (filter) |
|---|---|
| `src/pages/Projects.tsx` | `projects`, `tickets`, `project_members` |
| `src/pages/ProjectWorkspace.tsx` | `projects` filter `id=eq.{id}` |
| `src/features/team/useProjectRole.ts` | `project_members` filter `project_id=eq.{id}`, `team_members` |
| `src/features/team/ProjectTeam.tsx` | `project_members` filter `project_id=eq.{id}`, `team_members` |
| `src/features/timelog/useTicketTimeLogs.ts` | `time_logs` filter `ticket_id=eq.{id}` |
| `src/pages/MyWork.tsx` | `ticket_assignees`, `tickets`, `time_logs` |
| `src/components/TopBar.tsx` (UserPicker) | `team_members` |
| `src/features/health/ProjectHealth.tsx` | `project_members` filter project, `time_logs` |
| `src/features/health/EstimateEvolution.tsx` | `time_logs`, `projects` filter `id=eq.{id}` |
| `src/features/estimates/ProjectChangeRequests.tsx` | already uses `useAllEstimateChanges` (live) — also subscribe to `tickets` filtered by project so card data refreshes |
| `src/features/client-portal/usePortalData.ts` (`usePortalPreview` & `usePublicPortal`) | `tickets` (project filter for preview), `time_logs`, `ticket_estimate_changes`, `project_epics` (project filter), `project_epic_summaries` (project filter), `projects` (id filter). For public route, subscribe after first payload arrives so we know the project_id. |
| `src/features/client-portal/PortalEpicTrend.tsx` | `tickets` filter `project_id=eq.{id}`, `ticket_estimate_changes`, `time_logs`, `projects` filter `id=eq.{id}` |

Each subscription calls the existing `load()` / `refresh()` / re-runs the effect body via a small reload counter where needed.

## Step 3 — Cleanup
Wrap `TrendChart` (in `PortalEpicTrend.tsx`) and `EpicSummaryEditor` (in `ClientPortalEditor.tsx`) with `React.forwardRef` to silence the existing dev warnings ("Function components cannot be given refs").

## Out of scope
- No DB / RLS changes (publication already covers all tables).
- No change to local UI state (filters, search) — those are already instant.
- No new caching layer; we keep the simple "subscription → reload" pattern matching the rest of the codebase.
