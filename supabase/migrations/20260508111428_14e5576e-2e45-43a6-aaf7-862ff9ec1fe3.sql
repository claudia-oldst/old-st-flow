-- Idempotent recompute-from-SUM trigger for time_logs
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
  ELSE
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

DROP TRIGGER IF EXISTS apply_time_log_trg ON public.time_logs;
CREATE TRIGGER apply_time_log_trg
AFTER INSERT OR UPDATE OR DELETE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.apply_time_log();

-- Safety-net recompute for any drifted projects
WITH s AS (
  SELECT ticket_id,
    SUM(hours) FILTER (WHERE discipline='FE')      AS fe,
    SUM(hours) FILTER (WHERE discipline='BE')      AS be,
    SUM(hours) FILTER (WHERE discipline='Project') AS pj
  FROM public.time_logs GROUP BY ticket_id
)
UPDATE public.tickets t
SET actual_frontend_hours = COALESCE(s.fe, 0),
    actual_backend_hours  = COALESCE(s.be, 0),
    actual_project_hours  = COALESCE(s.pj, 0)
FROM s
WHERE s.ticket_id = t.id
  AND (t.actual_frontend_hours <> COALESCE(s.fe, 0)
    OR t.actual_backend_hours  <> COALESCE(s.be, 0)
    OR t.actual_project_hours  <> COALESCE(s.pj, 0));

UPDATE public.tickets t
SET actual_frontend_hours = 0,
    actual_backend_hours  = 0,
    actual_project_hours  = 0
WHERE NOT EXISTS (SELECT 1 FROM public.time_logs l WHERE l.ticket_id = t.id)
  AND (t.actual_frontend_hours <> 0
    OR t.actual_backend_hours <> 0
    OR t.actual_project_hours <> 0);
