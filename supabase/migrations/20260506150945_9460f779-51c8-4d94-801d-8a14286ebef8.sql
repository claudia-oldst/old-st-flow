-- Auto-snap current estimates to actuals when ticket enters "dev done" category
CREATE OR REPLACE FUNCTION public.snap_estimates_on_dev_done()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_cat public.status_category;
  old_cat public.status_category;
  actor uuid;
BEGIN
  IF NEW.status_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  SELECT category INTO new_cat FROM public.statuses WHERE id = NEW.status_id;
  IF new_cat IS DISTINCT FROM 'dev done'::public.status_category THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status_id IS NOT NULL THEN
    SELECT category INTO old_cat FROM public.statuses WHERE id = OLD.status_id;
    IF old_cat = 'dev done'::public.status_category THEN
      RETURN NEW; -- already in dev done; don't re-snap
    END IF;
  END IF;

  actor := COALESCE(auth.uid(), NEW.cr_decided_by);

  -- Frontend
  IF NEW.actual_frontend_hours < NEW.current_fe_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, delta, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'FE', NEW.current_fe_estimate, NEW.actual_frontend_hours,
         NEW.actual_frontend_hours - NEW.current_fe_estimate,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_fe_estimate := NEW.actual_frontend_hours;
  END IF;

  -- Backend
  IF NEW.actual_backend_hours < NEW.current_be_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, delta, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'BE', NEW.current_be_estimate, NEW.actual_backend_hours,
         NEW.actual_backend_hours - NEW.current_be_estimate,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_be_estimate := NEW.actual_backend_hours;
  END IF;

  -- Project
  IF NEW.actual_project_hours < NEW.current_project_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, delta, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'Project', NEW.current_project_estimate, NEW.actual_project_hours,
         NEW.actual_project_hours - NEW.current_project_estimate,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_project_estimate := NEW.actual_project_hours;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS snap_estimates_on_dev_done_trg ON public.tickets;
CREATE TRIGGER snap_estimates_on_dev_done_trg
  BEFORE INSERT OR UPDATE OF status_id ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.snap_estimates_on_dev_done();