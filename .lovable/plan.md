# Merge the Health and Portal estimate-trend components

You're right — the two trend charts are essentially the same feature drawn twice. They diverged enough that the Health one has a real bug (Actuals flat at 0 on big projects) while the Portal one chunks its queries and works. Merge is the right call, and it fixes the bug as a side effect.

## What's actually different today

| Concern | Health (`useEstimateEvolution` + `buildTrendData` + `EstimateTrendChart`) | Portal (`usePortalEpicTrendData` + `buildEpicTrendSeries` + `PortalTrendChart`) |
|---|---|---|
| Ticket source | Reuses cached `useProjectTickets` (full `TicketRow`) | Self-fetches a lite shape directly |
| Logs query | Single `.in("ticket_id", [all 655 ids])` → URL too long, returns nothing → **Actual = 0** | Chunks IDs into batches of 100 — works |
| Ticket "effective" time | `ticketEffectiveMs` (earliest FE/BE log, else created_at) | `created_at`, plus `cr_decided_at` for approved CRs |
| CR handling | Filters out non-approved CRs; treats original FE+BE like any other ticket | Holds CR original out of the curve until `cr_decided_at`, then folds it in |
| Selected-epic filter | Built into `buildTrendData` via `selectedEpic` string | Caller passes `ticketFilter` callback (more flexible) |
| Discounts | `actual - discounted` (subtracts from Actuals — same in both) | Same |
| Realtime | `useRealtimeInvalidate` (react-query keys) | `useRealtimeReload` (manual tick) |
| Chart | `EstimateTrendChart` (with epic Select + Legend) | `PortalTrendChart` (compact variant, no Select) |

So the math is ~95% the same; the meaningful divergences are (a) chunking and (b) CR effective-time treatment. Everything else is just two implementations of the same thing.

## ⚠️ Semantic change to flag

Dropping `ticketEffectiveMs` means the Health page's **Original** line will start higher, earlier — at `created_at` instead of at the first FE/BE log. This is more honest (it stops hiding committed scope until work begins) and matches the Portal chart the PM already trusts, but it WILL look different on the Health page after this lands. Calling it out so it's expected, not a regression report.

Escape hatch (documented in code, not wired yet): add an `effectiveTimeStrategy: "created" | "first-log"` option on `useTrendData`. Default `"created"`. If anyone misses the old behavior we flip the Health caller to `"first-log"` in one line.

## Target structure

New shared module: `src/features/_shared/estimate-trend/`

```
estimate-trend/
  types.ts              // TicketLite, ChangeLite, LogLite, TrendBucket, TrendInputs
  buildTrendSeries.ts   // single pure builder (replaces both buildTrendData + buildEpicTrendSeries)
  buildTrendSeries.test.ts
  fetchTrendData.ts     // chunked supabase fetch for tickets/changes/logs/projectStart
  useTrendData.ts       // react-query hook around fetchTrendData with realtime invalidation
  TrendChart.tsx        // single chart component, supports `compact` + optional headerRight slot
```

### `buildTrendSeries.ts` (the merged math)

- Inputs:
  ```ts
  {
    tickets: TicketLite[];           // already filtered to "relevant" by the hook (epic/CR rules)
    changes: ChangeLite[];
    logs: LogLite[];
    discounts: Array<{ hours: number; created_at: string }>;
    projectStart: Date | null;
    cutoffMs: number;
    ticketFilter: (ticketId: string) => boolean;   // for in-memory epic switching
  }
  ```
- `TicketLite` carries the fields needed by both flavors:
  ```ts
  {
    id, created_at, epic_id, ticket_type,
    original_fe_estimate, original_be_estimate,
    is_cr: boolean,
    cr_effective_at: string | null,     // null for non-CRs
  }
  ```
- Effective-time rule (unified, matches Portal):
  - Non-CR: ticket counts toward `original` at `created_at`.
  - Approved CR: ticket counts toward `original` at `cr_decided_at` (falls back to `created_at`). Non-approved CRs are filtered out upstream.
- Sampling, deltas, logs accumulation, and the `Math.max(0, actual - discounted)` rule are identical to today's portal builder.

### `fetchTrendData.ts` (the merged fetcher)

- Loads in one batch: `projects.start_date`, `tickets` for the project (lite columns), then chunked (100/batch) `ticket_estimate_changes` (approved only) and `time_logs` (FE+BE only). Same chunking pattern Portal already uses — this is what removes the Health-page bug.
- Returns `{ projectStart, tickets, changes, logs, ticketEpic }`.

### `useTrendData.ts`

- Wraps `fetchTrendData` in `useQuery` keyed by `["estimateTrend", projectId]`.
- Hooks up `useRealtimeInvalidate` on `projects`, `tickets`, `ticket_estimate_changes`, `time_logs` — replaces the bespoke `useRealtimeReload` tick.

### `TrendChart.tsx`

- Single chart: dashed Original / blue Current / orange Actual lines, same tooltip, same Y-axis `${v}h`.
- Props: `data`, optional `compact` (suppresses Legend), optional `headerRight` slot (so the Health page can drop in its `Select` of epics without the component knowing about epics).

## Call sites

### Health page — `src/features/health/EstimateEvolution.tsx`

- Replace `useEstimateEvolution`'s logs/changes/projectStart fetching with `useTrendData(projectId)`.
- Compute the chart series locally with `buildTrendSeries({ ..., ticketFilter: epicFilter(selectedEpic) })`.
- Pass the existing epic `<Select>` into `<TrendChart headerRight={<Select …/>} />`.
- **Keep `useEstimateEvolution` returning `epicSnapshots`** (consumed by `EpicRow` / `EpicRiskTable`) — only the trend half moves out. `buildEpicSnapshots.ts` and its callers stay untouched. The `estimate-evolution/` folder is partially preserved, not wiped.

### Portal — `src/features/client-portal/PortalEpicTrend.tsx`

- Replace `usePortalEpicTrendData` + `buildEpicTrendSeries` with `useTrendData(projectId)` + `buildTrendSeries`.
- Aggregated view: `ticketFilter` = include only tickets whose `epic_id ∈ includedIds`.
- Per-epic accordion: `ticketFilter` per epic (`(tid) => ticketEpic.get(tid) === e.id`), plus the existing discount-by-epic slice. Each row gets its own filter — verified per-row, not a shared closure.
- Use `<TrendChart compact />` for the per-epic mini-charts; the wrapper card chrome stays identical.

### `PortalEpicTable.tsx`

- Still consumes the Portal hook today. Switch it to `useTrendData` + `buildTrendSeries`, with **per-row `ticketFilter` bound to that row's epic_id** so the expandable mini-charts don't accidentally share an aggregate filter.

## Deletion checklist (only after grep confirms zero imports)

- [ ] `src/features/health/estimate-evolution/buildTrendData.ts`
- [ ] `src/features/health/estimate-evolution/EstimateTrendChart.tsx`
- [ ] `src/features/health/estimate-evolution/ticketEffectiveMs.ts` (only used by the deleted builder)
- [ ] `src/features/client-portal/epic-trend/` (entire folder, including `PortalTrendChart.tsx`, `usePortalEpicTrendData.ts`, and its test — coverage moves to `buildTrendSeries.test.ts`)
- [ ] The `useRealtimeReload` import + tick in any portal consumer that no longer needs it
- [ ] The `evolutionLogs` query + its realtime hook inside `useEstimateEvolution`

Leave in place: `buildEpicSnapshots.ts`, `useEstimateEvolution` (slimmed), `EpicRow.tsx`, `EpicRiskTable.tsx`, `dateUtils.ts` (still used by snapshots).

## Verification

1. Project Cousteau R1 → Project Health → Estimate Evolution: Actual line should rise to ~664h on 12 Apr and ~1,100h by 19 Jun, matching the Portal chart in the user's screenshot.
2. Same project → Client Portal: chart should be visually identical to today's.
3. Smaller project (Project Cousteau, ~828 logs): both charts render unchanged.
4. Epic selector on the Health page still re-buckets correctly when toggled.
5. Portal per-epic accordion: each mini-chart shows that epic's series, not the aggregate.
6. Realtime: log a new entry, both charts update on the next render.
7. Health page Original line — confirm with PM that the new earlier rise (from `created_at` rather than first log) is expected.

## Unit tests on `buildTrendSeries`

- Non-CR ticket — original folded in at `created_at`, actuals accumulate from logs.
- **Approved CR with `cr_decided_at` strictly between projectStart and cutoff** — original is 0 before the decision, jumps up exactly on/after the decision sample. (Most regression-prone case — explicitly covered.)
- Approved CR with no `cr_decided_at` — falls back to `created_at`.
- Rejected/pending CR — excluded entirely.
- Discount subtraction — `actual - discounted` clamped at 0.
- Empty inputs — returns `[]`.
- Cutoff before project start — returns `[]`.
- `ticketFilter` — when filter excludes a ticket, neither its original nor its logs contribute.

## Out of scope (call out for later)

- Whether discounts should reduce **Actuals** at all (`Math.max(0, actual - discounted)`). Both implementations do this today; leaving the behavior identical so the merge is a pure refactor + bug fix.
- Wiring up `effectiveTimeStrategy: "first-log"` to any caller. The flag is documented in the hook signature only; flip it on if the PM wants the old Health behavior back.
