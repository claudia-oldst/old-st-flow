## What's wrong

The Health rings (Frontend 732.3h, Backend 658.6h, Project 42.0h) are exactly **2× the real time-logs**, while the Estimate Evolution graph (~700h aggregated) is correct.

DB confirms it for this project:

| | tickets.actual_*_hours (rings) | sum(time_logs.hours) (graph) |
|---|---|---|
| FE | 732.32 | 366.16 |
| BE | 658.64 | 329.32 |
| Project | 41.96 | 20.98 |

Every actual is doubled, exactly.

## Root cause

`rehydrate_project` (migration `20260508104709`) does two things in the same transaction:

1. Inserts each ticket with `actual_frontend_hours / actual_backend_hours / actual_project_hours` taken straight from the snapshot (the values that were correct at archive time).
2. Re-inserts every row of `time_logs`.

But `time_logs` has an `AFTER INSERT` trigger (migration `20260428143002`) that increments `tickets.actual_*_hours` by the new row's hours. So during rehydrate the snapshot value is loaded, then the trigger adds the same hours again on top → exact doubling.

The graph isn't affected because `useEstimateEvolution` reads `time_logs` directly, not the cached ticket columns.

## Fix

Two parts, both DB-only. No frontend changes.

### 1. Fix `rehydrate_project` so future restores are correct

Drop and recreate the function with one change: insert tickets with `actual_frontend_hours = 0`, `actual_backend_hours = 0`, `actual_project_hours = 0`. The trigger on the subsequent `time_logs` insert will rebuild them to the correct totals.

(Snapshot values for actuals become advisory — the time-logs are the source of truth, which they already are everywhere else in the app.)

### 2. Repair already-rehydrated data

A one-shot UPDATE that recomputes `actual_frontend_hours / actual_backend_hours / actual_project_hours` for every ticket from `time_logs`. This corrects the current project and any other previously-rehydrated project in the same state.

```sql
UPDATE tickets t
SET actual_frontend_hours = COALESCE(s.fe, 0),
    actual_backend_hours  = COALESCE(s.be, 0),
    actual_project_hours  = COALESCE(s.pj, 0)
FROM (
  SELECT ticket_id,
         SUM(hours) FILTER (WHERE discipline='FE')      AS fe,
         SUM(hours) FILTER (WHERE discipline='BE')      AS be,
         SUM(hours) FILTER (WHERE discipline='Project') AS pj
  FROM time_logs GROUP BY ticket_id
) s
WHERE s.ticket_id = t.id
  AND (t.actual_frontend_hours <> COALESCE(s.fe,0)
    OR t.actual_backend_hours  <> COALESCE(s.be,0)
    OR t.actual_project_hours  <> COALESCE(s.pj,0));
```

Both go in a single migration. Approve and the rings will match the graph immediately.

## Out of scope

- No edge function changes (`rehydrate-project/index.ts` only calls the RPC).
- No UI changes — the Health page already displays the correct columns; they'll just hold correct numbers.
- `cached_total_hours` / `cached_total_cost` are reset to 0 by the rehydrate UPDATE and only repopulated on archive — not affected.
