## Goal

Replace the delta-based `apply_time_log` trigger with an **idempotent recompute-from-SUM** version. The cached `tickets.actual_*_hours` columns stay (no frontend changes), but they're rebuilt from `time_logs` after every change instead of being incremented. Any future bulk insert / replay / rehydration is automatically correct.

## Changes (one DB migration)

### 1. Rewrite `public.apply_time_log()`

Make it a single statement that recomputes the affected ticket(s) from `time_logs`:

```sql
CREATE OR REPLACE FUNCTION public.apply_time_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected := ARRAY[NEW.ticket_id];
  ELSIF TG_OP = 'DELETE' THEN
    affected := ARRAY[OLD.ticket_id];
  ELSE -- UPDATE: ticket_id may have changed
    affected := ARRAY[NEW.ticket_id, OLD.ticket_id];
  END IF;

  UPDATE public.tickets t
  SET actual_frontend_hours = COALESCE(s.fe, 0),
      actual_backend_hours  = COALESCE(s.be, 0),
      actual_project_hours  = COALESCE(s.pj, 0)
  FROM (
    SELECT tk.id AS ticket_id,
           SUM(l.hours) FILTER (WHERE l.discipline='FE')      AS fe,
           SUM(l.hours) FILTER (WHERE l.discipline='BE')      AS be,
           SUM(l.hours) FILTER (WHERE l.discipline='Project') AS pj
    FROM public.tickets tk
    LEFT JOIN public.time_logs l ON l.ticket_id = tk.id
    WHERE tk.id = ANY(affected)
    GROUP BY tk.id
  ) s
  WHERE t.id = s.ticket_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
```

Properties:
- Idempotent: result depends only on the current `time_logs` rows.
- Handles INSERT, UPDATE (incl. moving a log to another ticket), DELETE.
- No more drift, no `GREATEST(0, …)` workarounds.

### 2. One-time recompute (safety net)

Same recompute-from-SUM UPDATE we already did, kept in the migration so any other project that still holds residual drift gets cleaned up:

```sql
WITH s AS (
  SELECT ticket_id,
    SUM(hours) FILTER (WHERE discipline='FE')      AS fe,
    SUM(hours) FILTER (WHERE discipline='BE')      AS be,
    SUM(hours) FILTER (WHERE discipline='Project') AS pj
  FROM public.time_logs GROUP BY ticket_id
)
UPDATE public.tickets t
SET actual_frontend_hours = COALESCE(s.fe,0),
    actual_backend_hours  = COALESCE(s.be,0),
    actual_project_hours  = COALESCE(s.pj,0)
FROM s WHERE s.ticket_id = t.id;

UPDATE public.tickets t
SET actual_frontend_hours = 0, actual_backend_hours = 0, actual_project_hours = 0
WHERE NOT EXISTS (SELECT 1 FROM public.time_logs l WHERE l.ticket_id = t.id);
```

### 3. Simplify `rehydrate_project` (optional cleanup)

With an idempotent trigger, `rehydrate_project` can safely insert ticket actuals as snapshot values OR zeros — both produce the same result after time_logs replay. We'll keep the current "insert as 0" form (already correct, no change needed). No edit to the RPC.

## Out of scope

- No frontend changes. All ~15 read sites keep using `tickets.actual_*_hours`.
- No edge function changes.
- No schema changes — same columns, same types.

## Risk

Very low. The trigger fires once per `time_logs` row change and does a single `UPDATE … WHERE id = ANY(...)` against at most 2 tickets. Perf is on par with the current 2-statement delta version.
