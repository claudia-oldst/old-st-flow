-- 1. Drop the duplicate triggers, keeping just one canonical trigger.
DROP TRIGGER IF EXISTS apply_time_log_trigger ON public.time_logs;
DROP TRIGGER IF EXISTS time_logs_apply ON public.time_logs;

-- 2. Reconcile every ticket's actual hours from the raw time_logs.
WITH sums AS (
  SELECT ticket_id,
    COALESCE(SUM(CASE WHEN discipline = 'FE' THEN hours END), 0) AS fe,
    COALESCE(SUM(CASE WHEN discipline = 'BE' THEN hours END), 0) AS be,
    COALESCE(SUM(CASE WHEN discipline = 'Project' THEN hours END), 0) AS pj
  FROM public.time_logs
  GROUP BY ticket_id
)
UPDATE public.tickets t
SET actual_frontend_hours = COALESCE(s.fe, 0),
    actual_backend_hours  = COALESCE(s.be, 0),
    actual_project_hours  = COALESCE(s.pj, 0)
FROM sums s
WHERE s.ticket_id = t.id
  AND (t.actual_frontend_hours <> COALESCE(s.fe, 0)
    OR t.actual_backend_hours  <> COALESCE(s.be, 0)
    OR t.actual_project_hours  <> COALESCE(s.pj, 0));

-- Also zero out tickets that have no logs but stored non-zero actuals.
UPDATE public.tickets t
SET actual_frontend_hours = 0,
    actual_backend_hours = 0,
    actual_project_hours = 0
WHERE NOT EXISTS (SELECT 1 FROM public.time_logs tl WHERE tl.ticket_id = t.id)
  AND (t.actual_frontend_hours <> 0
    OR t.actual_backend_hours <> 0
    OR t.actual_project_hours <> 0);