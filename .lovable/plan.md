## Goal
Add pagination across list-heavy views with explicit per-surface page sizes, scope `useAllEstimateChanges` to the current project, and remove the `limit(2000)` truncation. **List view** runs filters/sort/search **server-side** so pagination is over the filtered result set.

## Page sizes (`src/lib/pagination.ts`)
```ts
export const PAGE_SIZES = {
  projects: 10,
  ticketsKanban: 400,    // hard cap
  ticketsList: 400,      // page size (server-paged)
  epicChangesPage: 15,   // CR page (epic cards)
  epicEstimatesPage: 15, // Estimate Revisions page (epic rows)
  inlineRecent: 6,       // inline lists next to graphs
} as const;
```

## 1. List view — server-side filters/sort/search

### New RPC: `public.list_project_tickets(_filters jsonb, _page int, _page_size int, _sort_col text, _sort_dir text)`
- `SECURITY INVOKER` (RLS-respecting), one migration.
- Returns `{ rows: jsonb, total: int }`. `rows` matches today's `TicketRow` shape (epic name + assignees aggregated via `jsonb_agg` on `project_epics` and `ticket_assignees`).
- Sort whitelist: `position`, `ticket_number`, `created_at`, `updated_at`, `current_fe_estimate`, `current_be_estimate`, `current_project_estimate`, `actual_frontend_hours`, `actual_backend_hours`. Direction: `asc | desc`.
- Filter mapping:
  - Search → `title ILIKE %q%` OR `formatted_id ILIKE %q%`
  - `types` → `ticket_type = ANY`
  - `statusIds` (`_none` → null) → `status_id = ANY` OR `IS NULL`
  - `epicIds` (`_none` → null) → `epic_id = ANY` OR `IS NULL`
  - `versions` (`_none` → null) → `version = ANY` OR `IS NULL`
  - `feStatuses` → `fe_status = ANY` AND `EXISTS (… ticket_assignees slot='FE')`
  - `beStatuses` → `be_status = ANY` AND `EXISTS (… ticket_assignees slot='BE')`
  - `assigneeIds` → `EXISTS (… user_id = ANY)`; `_unassigned` → `NOT EXISTS`
  - `health` (good/warn/bad) → expression on `actual / NULLIF(estimate, 0)` per discipline (slot must be assigned), bucket matches any of selected
  - `filterMine` (user_id) → same `EXISTS` for given user

### Hook split
- **Keep** `useProjectTickets(projectId)` for callers needing the unfiltered list (Kanban, dialogs, change-requests ticket cache). Capped at 400 with `truncated`/`totalCount` flags.
- **New** `useProjectTicketsPaged(projectId, { filters, search, sort, page, pageSize })` calls the RPC. Returns `{ rows, total, loading }`.
- `useRealtimeReload` keyed on `projectId` (`tickets`, `ticket_assignees`) refetches the current page on event. Same instant-feel.

### `ProjectTickets.tsx` wiring
- Board branch keeps using `useProjectTickets` (unchanged).
- List branch swaps to `useProjectTicketsPaged` + `<ListPagination>`.
- `useProjectTicketsView` keeps grouping/selection helpers; filter application moves out (RPC does it).
- BulkActionsBar continues to act on current-page selection (today's behavior).

## 2. Projects page (`src/pages/Projects.tsx`)
- Page size **10**.
- Paged `select` + `count: "exact"`.
- Replace counts (today fetches every ticket + member row across all projects) with per-card `count: "exact", head: true` — only for the 10 visible projects.

## 3. Kanban (`ProjectBoard` via `useProjectTickets`)
- Hard cap **400**. Hook fetches first 400 + `count`. If `count > 400`, expose `truncated`.
- Banner above columns when truncated: "Showing first 400 of N — switch to List view to page through the rest." DnD/behavior unchanged.

## 4. Inline 6-latest lists (next to graphs)
- `EpicChangeCard`: cap inline change rows to **6 latest** + "Show all (N)" toggle.
- `EpicRow` (Estimate Revisions): add a **6 latest** mini-list of revisions for that epic + "Show all (N)" toggle. Revisions sourced from already-loaded `ticket_estimate_changes`.

## 5. Change Requests page (`ProjectChangeRequests.tsx`)
- Page size **15 epic cards**.
- Sort epic groups by latest change `created_at desc` before paginating.
- `<ListPagination>` under the list. Filters/date range still apply pre-pagination.

## 6. Estimate Revisions page (`EstimateEvolution.tsx`)
- Page size **15 epic rows**.
- Sort epics by most recent revision activity `desc` before paginating.
- `<ListPagination>` inside the existing collapsible.

## 7. `useAllEstimateChanges(projectId)`
- Now requires `projectId`; empty until provided.
- Drop `.limit(2000)`.
- Server-scope via `tickets!inner` + `.eq("ticket.project_id", projectId)`.
- `projects` → `.eq("id", projectId)`. `epics` → `.eq("project_id", projectId)`.
- Realtime channels: `tickets` and `project_epics` get `filter: project_id=eq.${projectId}`. `ticket_estimate_changes` stays unfiltered (no project_id column; reload is project-scoped).

## Shared bits
- `src/components/ListPagination.tsx`: thin wrapper around existing shadcn pagination — `page / total / pageSize / onChange`.
- `src/lib/pagination.ts`: page-size constants.

## Migration
Single migration creates `list_project_tickets` RPC. No table or RLS changes.

## Out of scope
- Virtualization (not needed at 400/page).
- React Query migration.
- Server-side pagination for `useAllEstimateChanges` body rows (project-scoped query is small enough; pagination only at the epic-card level).

## Why this is safe
- All existing hook signatures stay backward-compatible (additive `opts` only); new paged hook is opt-in.
- Realtime preserved everywhere.
- Skeletons (added previously) keep perceived perf solid.
- Approve/reject/edit/DnD flows untouched.
