## Problem

Ticket `COU-004` (`50faaecd…`) shows:
- `actual_frontend_hours = 70.09`
- `actual_backend_hours = 68.81`

But every `time_logs` row for this ticket is `discipline = BE`, summing to exactly **138.90 h**. Correct values should be FE = 0, BE = 138.90.

## Root Cause

The `apply_time_log` trigger updates `tickets.actual_*_hours` only on `INSERT` and `DELETE` of `time_logs`. It does **not** handle `UPDATE`. When Ida's logs (originally `FE` because her global `team_members.role` is Frontend, even though her project role on COU is Backend) were later edited to `BE`, the cached actuals on the ticket were not adjusted — leaving FE hours stuck and BE hours undercounted.

This is a systemic bug, not just one ticket.

## Fix — Two parts

### 1. Patch the trigger to handle UPDATEs (schema migration)

Extend `apply_time_log()` with an `UPDATE` branch that subtracts the OLD contribution and adds the NEW contribution across `ticket_id`, `discipline`, and `hours` (handles edits to any of those three fields, including moving a log between tickets).

```sql
ELSIF TG_OP = 'UPDATE' THEN
  -- reverse OLD
  UPDATE public.tickets SET
    actual_frontend_hours = GREATEST(0, actual_frontend_hours - CASE WHEN OLD.discipline='FE' THEN OLD.hours ELSE 0 END),
    actual_backend_hours  = GREATEST(0, actual_backend_hours  - CASE WHEN OLD.discipline='BE' THEN OLD.hours ELSE 0 END),
    actual_project_hours  = GREATEST(0, actual_project_hours  - CASE WHEN OLD.discipline='Project' THEN OLD.hours ELSE 0 END)
  WHERE id = OLD.ticket_id;
  -- apply NEW
  UPDATE public.tickets SET
    actual_frontend_hours = actual_frontend_hours + CASE WHEN NEW.discipline='FE' THEN NEW.hours ELSE 0 END,
    actual_backend_hours  = actual_backend_hours  + CASE WHEN NEW.discipline='BE' THEN NEW.hours ELSE 0 END,
    actual_project_hours  = actual_project_hours  + CASE WHEN NEW.discipline='Project' THEN NEW.hours ELSE 0 END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
```

Ensure the trigger is bound for `AFTER INSERT OR UPDATE OR DELETE` on `time_logs`.

### 2. One-time retroactive recompute (data fix)

Recompute every ticket's cached actuals from the source-of-truth `time_logs` table:

```sql
UPDATE public.tickets t SET
  actual_frontend_hours = COALESCE(s.fe, 0),
  actual_backend_hours  = COALESCE(s.be, 0),
  actual_project_hours  = COALESCE(s.pj, 0)
FROM (
  SELECT ticket_id,
    SUM(hours) FILTER (WHERE discipline='FE')      AS fe,
    SUM(hours) FILTER (WHERE discipline='BE')      AS be,
    SUM(hours) FILTER (WHERE discipline='Project') AS pj
  FROM public.time_logs
  GROUP BY ticket_id
) s
WHERE t.id = s.ticket_id;

-- also zero out tickets that have no logs at all
UPDATE public.tickets SET
  actual_frontend_hours = 0, actual_backend_hours = 0, actual_project_hours = 0
WHERE id NOT IN (SELECT DISTINCT ticket_id FROM public.time_logs);
```

After this, COU-004 will read FE = 0, BE = 138.90, matching the logs.

## Note on the broader Ida scenario

This explains *why* Ida's logs needed editing in the first place: `LogTimeModal` derives the discipline tab default from `team_members.role` (global), not `project_members.role` (per-project). That mismatch is the same theme as the earlier "derive discipline from project role" discussion — but this plan does **not** touch that logic. It only repairs the cache + trigger so manual edits to `time_logs.discipline` correctly update ticket actuals going forward.

If you want, I can follow up with a separate change to default the LogTimeModal discipline tab from the project role.
