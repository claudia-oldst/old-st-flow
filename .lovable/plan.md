## Goal

Make `QueryClientProvider` actually do its job: migrate the data-fetching hooks to `useQuery` so we get caching, request dedupe, background refetch, `staleTime`, and a single source of truth — without changing any UI behavior or breaking realtime updates.

## Approach

Keep the public shape of every hook identical (same returned property names: `tickets / rows / changes / loading / reload / total / truncated`, etc.) so call sites don't change. Internally each hook becomes a thin `useQuery` wrapper. Realtime stays exactly as today — just swap `reload()` for `queryClient.invalidateQueries({ queryKey })`.

### 1. Configure the client (`src/App.tsx`)

Replace `new QueryClient()` with sensible defaults so the migration delivers actual benefits:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // dedupe within 30s
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false, // we have realtime; don't double-fetch
      retry: 1,
    },
  },
})
```

### 2. Add a small realtime→invalidate helper (`src/hooks/useRealtimeInvalidate.ts`)

Thin wrapper around the existing `useRealtimeReload` that calls `queryClient.invalidateQueries({ queryKey })` instead of taking a callback. Keeps the 50ms coalescing we already have.

```ts
export function useRealtimeInvalidate(tables, queryKey, enabled = true) {
  const qc = useQueryClient();
  useRealtimeReload(tables, () => qc.invalidateQueries({ queryKey }), enabled);
}
```

### 3. Migrate hooks (one-for-one, no API changes)

For each hook below: extract the existing fetch body into an async fetcher, wrap with `useQuery`, expose `reload = () => qc.invalidateQueries({ queryKey })`, wire realtime via the new helper.

Hooks to migrate (in this order):

1. `features/tickets/useProjectTickets.ts` — `["projectTickets", projectId]`
2. `features/tickets/useProjectTicketsPaged.ts` — `["projectTicketsPaged", projectId, filters, search, sort, page, pageSize, filterMineUserId]` (structured key replaces `JSON.stringify` + `eslint-disable`); `placeholderData: keepPreviousData` so pagination/filter changes don't flash skeletons.
3. `features/estimates/useAllEstimateChanges.ts` — `["estimateChanges", projectId]` (collapse the 3 parallel fetches into one `queryFn` that does `Promise.all`).
4. `features/estimates/useEstimateChanges.ts` — `["estimateChangesByTicket", ticketId]`
5. `features/epics/useProjectEpics.ts` — `["projectEpics", projectId]`
6. `features/statuses/useStatuses.ts` — `["statuses", projectId]`
7. `features/team/useProjectRole.ts` — `["projectRole", projectId, userId]`
8. `features/comments/useTicketComments.ts` — `["ticketComments", ticketId]`
9. `features/timelog/useTicketTimeLogs.ts` — `["ticketTimeLogs", ticketId]`
10. `features/health/estimate-evolution/useEstimateEvolution.ts` — `["estimateEvolution", projectId, range]`
11. `features/client-portal/usePortalData.ts` & `useClientPortalCRs.ts` — `["portal", hash]` / `["portalCRs", hash]`

Hooks that are intentionally NOT touched:
- `useCardDisplayPrefs` (localStorage), `useRealtimeReload` (primitive), `useTicketsCsvImport` / `useDraftRows` / `useProjectTicketsView` (pure UI state), `useColumnResize`, `useTicketsSort`, `useTicketsGrouping`. These hold UI-only state, not server data.

### 4. Mutations (out of scope for this pass)

Approve/reject and other writes stay as direct `supabase.from(...).update(...)` calls but switch their post-write `reload()` invocation to `queryClient.invalidateQueries({ queryKey })`. No `useMutation` rewrite — keep the diff focused.

## Why this is safe

- **Same return shape** at every call site → zero component edits needed beyond imports.
- **Realtime still drives freshness** — invalidation triggers a refetch identical in timing to the old `reload()`.
- **`keepPreviousData`** on the paged hook eliminates the "blank table while typing" flash users currently get.
- `staleTime: 30s` + dedupe means navigating between Board ↔ List ↔ Change Requests reuses cache instead of refiring 4 RPCs.

## Technical details

- **Query keys** are arrays of primitives/objects (React Query hashes them structurally) — no more `JSON.stringify` deps or `eslint-disable`.
- **Loading semantics**: expose `loading = query.isPending` (first load) so the existing `listLoading && rows.length === 0` skeleton check keeps working. For the paged hook we'll specifically use `isPending` not `isFetching`, so background refetches don't blank the table.
- **Error handling**: log via `query.error` in a `useEffect`, mirror the current `console.error` + empty-state behavior. No toast spam.
- **Realtime**: the existing channels stay (`tickets`, `ticket_assignees`, `project_epics`, `ticket_estimate_changes`). Only the callback target changes (invalidate instead of reload).
- **`reload()` returned by hooks** becomes `() => queryClient.invalidateQueries({ queryKey })` so existing call sites (e.g. `TicketDetailSheet onChange={() => { reload(); paged.reload(); }}`) keep working unchanged.

## Out of scope (kept as separate items in the prior review)

- Extracting `toTicketRow()` / `groupChangesByEpic()` helpers
- Atomic approve/reject RPC
- Removing the FK-alias retry fallback in `useAllEstimateChanges`
- Collapsing `Projects.tsx` N+1 counts into a single RPC

## Verification

After implementation, in preview:
1. Tickets list paginates without skeleton flash, filters apply, "Showing X–Y of Z" stays correct.
2. Board view loads, truncation banner still appears past the cap.
3. Change Requests page groups + paginates as before.
4. Edit a ticket → realtime invalidates → list/board both refresh.
5. React Query Devtools (optional, only if you want it added — say the word) would show cached queries, but no devtools install in this pass.
