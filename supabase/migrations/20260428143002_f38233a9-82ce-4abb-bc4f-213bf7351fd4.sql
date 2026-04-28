-- 1. Patch trigger function to handle UPDATE
CREATE OR REPLACE FUNCTION public.apply_time_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tickets SET
      actual_frontend_hours = actual_frontend_hours + CASE WHEN NEW.discipline = 'FE' THEN NEW.hours ELSE 0 END,
      actual_backend_hours  = actual_backend_hours  + CASE WHEN NEW.discipline = 'BE' THEN NEW.hours ELSE 0 END,
      actual_project_hours  = actual_project_hours  + CASE WHEN NEW.discipline = 'Project' THEN NEW.hours ELSE 0 END
    WHERE id = NEW.ticket_id;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse OLD contribution from old ticket
    UPDATE public.tickets SET
      actual_frontend_hours = GREATEST(0, actual_frontend_hours - CASE WHEN OLD.discipline = 'FE' THEN OLD.hours ELSE 0 END),
      actual_backend_hours  = GREATEST(0, actual_backend_hours  - CASE WHEN OLD.discipline = 'BE' THEN OLD.hours ELSE 0 END),
      actual_project_hours  = GREATEST(0, actual_project_hours  - CASE WHEN OLD.discipline = 'Project' THEN OLD.hours ELSE 0 END)
    WHERE id = OLD.ticket_id;
    -- Apply NEW contribution to new ticket
    UPDATE public.tickets SET
      actual_frontend_hours = actual_frontend_hours + CASE WHEN NEW.discipline = 'FE' THEN NEW.hours ELSE 0 END,
      actual_backend_hours  = actual_backend_hours  + CASE WHEN NEW.discipline = 'BE' THEN NEW.hours ELSE 0 END,
      actual_project_hours  = actual_project_hours  + CASE WHEN NEW.discipline = 'Project' THEN NEW.hours ELSE 0 END
    WHERE id = NEW.ticket_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tickets SET
      actual_frontend_hours = GREATEST(0, actual_frontend_hours - CASE WHEN OLD.discipline = 'FE' THEN OLD.hours ELSE 0 END),
      actual_backend_hours  = GREATEST(0, actual_backend_hours  - CASE WHEN OLD.discipline = 'BE' THEN OLD.hours ELSE 0 END),
      actual_project_hours  = GREATEST(0, actual_project_hours  - CASE WHEN OLD.discipline = 'Project' THEN OLD.hours ELSE 0 END)
    WHERE id = OLD.ticket_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 2. Ensure trigger is bound for INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS apply_time_log_trg ON public.time_logs;
CREATE TRIGGER apply_time_log_trg
AFTER INSERT OR UPDATE OR DELETE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.apply_time_log();

-- 3. One-time recompute from source-of-truth time_logs
UPDATE public.tickets t SET
  actual_frontend_hours = COALESCE(s.fe, 0),
  actual_backend_hours  = COALESCE(s.be, 0),
  actual_project_hours  = COALESCE(s.pj, 0)
FROM (
  SELECT ticket_id,
    SUM(hours) FILTER (WHERE discipline = 'FE')      AS fe,
    SUM(hours) FILTER (WHERE discipline = 'BE')      AS be,
    SUM(hours) FILTER (WHERE discipline = 'Project') AS pj
  FROM public.time_logs
  GROUP BY ticket_id
) s
WHERE t.id = s.ticket_id;

-- Zero out tickets with no logs
UPDATE public.tickets SET
  actual_frontend_hours = 0,
  actual_backend_hours = 0,
  actual_project_hours = 0
WHERE id NOT IN (SELECT DISTINCT ticket_id FROM public.time_logs WHERE ticket_id IS NOT NULL);