
-- Part 1: Backfill
UPDATE public.tickets SET
  original_project_estimate = original_fe_estimate + original_be_estimate + original_project_estimate,
  current_project_estimate  = current_fe_estimate  + current_be_estimate  + current_project_estimate,
  original_fe_estimate = 0, original_be_estimate = 0,
  current_fe_estimate  = 0, current_be_estimate  = 0
WHERE ticket_type = 'Proj';

UPDATE public.time_logs SET discipline = 'Project'
WHERE discipline IN ('FE','BE')
  AND ticket_id IN (SELECT id FROM public.tickets WHERE ticket_type='Proj');

UPDATE public.tickets t SET
  actual_frontend_hours = 0,
  actual_backend_hours  = 0,
  actual_project_hours  = COALESCE((SELECT SUM(hours) FROM public.time_logs WHERE ticket_id = t.id), 0)
WHERE t.ticket_type = 'Proj';

-- Part 2: Trigger A — enforce zero FE/BE on Proj tickets
CREATE OR REPLACE FUNCTION public.enforce_proj_ticket_zero_fe_be()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ticket_type = 'Proj' THEN
    IF COALESCE(NEW.original_fe_estimate,0) <> 0 OR COALESCE(NEW.original_be_estimate,0) <> 0 THEN
      NEW.original_project_estimate := COALESCE(NEW.original_project_estimate,0)
        + COALESCE(NEW.original_fe_estimate,0) + COALESCE(NEW.original_be_estimate,0);
      NEW.original_fe_estimate := 0;
      NEW.original_be_estimate := 0;
    END IF;
    IF COALESCE(NEW.current_fe_estimate,0) <> 0 OR COALESCE(NEW.current_be_estimate,0) <> 0 THEN
      NEW.current_project_estimate := COALESCE(NEW.current_project_estimate,0)
        + COALESCE(NEW.current_fe_estimate,0) + COALESCE(NEW.current_be_estimate,0);
      NEW.current_fe_estimate := 0;
      NEW.current_be_estimate := 0;
    END IF;
    NEW.actual_frontend_hours := 0;
    NEW.actual_backend_hours := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_proj_ticket_zero_fe_be ON public.tickets;
CREATE TRIGGER enforce_proj_ticket_zero_fe_be
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_proj_ticket_zero_fe_be();

-- Trigger B — coerce time_log discipline to 'Project' for Proj tickets
CREATE OR REPLACE FUNCTION public.coerce_proj_time_log_discipline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  t_type public.ticket_type;
BEGIN
  SELECT ticket_type INTO t_type FROM public.tickets WHERE id = NEW.ticket_id;
  IF t_type = 'Proj' AND NEW.discipline IN ('FE','BE') THEN
    NEW.discipline := 'Project';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coerce_proj_time_log_discipline ON public.time_logs;
CREATE TRIGGER coerce_proj_time_log_discipline
BEFORE INSERT OR UPDATE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.coerce_proj_time_log_discipline();
