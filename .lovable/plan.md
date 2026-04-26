## Goal

Bring `tickets.current_fe_estimate` and `tickets.current_be_estimate` in sync with the most recent approved row in `ticket_estimate_changes` for each `(ticket_id, discipline)`. No application code changes.

## Scope

- Only `status = 'approved'` changes are applied. Pending requests (e.g. COU-322 FE, COU-016 BE) are skipped.
- For each `(ticket_id, discipline)`, the latest approved row's `new_hours` becomes the corresponding `current_*_estimate`.
- Tickets with no approved change rows are left untouched.

## Affected rows

22 ticket/discipline pairs are out of sync and will be updated, including:

```text
COU-001 FE  44.89 → 94.89
COU-003 BE   1.61 →  9.61
COU-006 BE   5.22 → 25.22
COU-008 FE   5.22 → 61.22
COU-008 BE   0    →  6.00
COU-010 FE   3.22 →  8.22
COU-045 FE   2.61 → 28.61
COU-055 BE   0    →  5.00
COU-068 BE   1.61 →  7.61
COU-069 BE   0    →  1.00
COU-071 FE   2.42 →  7.42
COU-073 FE   0.71 →  1.71
COU-099 FE   0.81 →  6.31
COU-100 FE   1.61 →  5.61
COU-117 FE   1.42 →  2.92
COU-126 FE   1.61 →  9.61
COU-128 BE   1.61 →  4.00
COU-231 FE   0    →  2.00
COU-272 FE   1.42 →  5.42
COU-276 FE   2.61 →  7.11
COU-281 FE   1.61 →  3.61
COU-345 FE   5.22 → 12.22
```

## SQL to run (single migration)

```sql
WITH latest AS (
  SELECT DISTINCT ON (ticket_id, discipline)
    ticket_id, discipline, new_hours
  FROM public.ticket_estimate_changes
  WHERE status = 'approved'
  ORDER BY ticket_id, discipline, created_at DESC, id DESC
)
UPDATE public.tickets t
SET
  current_fe_estimate = COALESCE(fe.new_hours, t.current_fe_estimate),
  current_be_estimate = COALESCE(be.new_hours, t.current_be_estimate),
  updated_at = now()
FROM (SELECT ticket_id, new_hours FROM latest WHERE discipline = 'FE') fe
FULL OUTER JOIN (SELECT ticket_id, new_hours FROM latest WHERE discipline = 'BE') be
  ON fe.ticket_id = be.ticket_id
WHERE t.id = COALESCE(fe.ticket_id, be.ticket_id);
```

Notes:
- `DISTINCT ON` picks the newest approved row per `(ticket_id, discipline)`.
- `COALESCE` ensures that if only one discipline has a change, the other estimate is preserved.
- `updated_at` is bumped so downstream listeners see the change.

## Verification

After running, this query should return zero rows:

```sql
WITH latest AS (
  SELECT DISTINCT ON (ticket_id, discipline)
    ticket_id, discipline, new_hours
  FROM public.ticket_estimate_changes
  WHERE status = 'approved'
  ORDER BY ticket_id, discipline, created_at DESC, id DESC
)
SELECT t.formatted_id, l.discipline, l.new_hours
FROM latest l JOIN public.tickets t ON t.id = l.ticket_id
WHERE (l.discipline='FE' AND t.current_fe_estimate <> l.new_hours)
   OR (l.discipline='BE' AND t.current_be_estimate <> l.new_hours);
```
