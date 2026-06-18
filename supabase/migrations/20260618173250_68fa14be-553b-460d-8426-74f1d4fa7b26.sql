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
  -- Only snap on UPDATE transitions; on INSERT the ticket row doesn't yet
  -- exist, so the FK from ticket_estimate_changes.ticket_id would fail.
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  SELECT category INTO new_cat FROM public.statuses WHERE id = NEW.status_id;
  IF new_cat IS DISTINCT FROM 'dev done'::public.status_category THEN
    RETURN NEW;
  END IF;

  IF OLD.status_id IS NOT NULL THEN
    SELECT category INTO old_cat FROM public.statuses WHERE id = OLD.status_id;
    IF old_cat = 'dev done'::public.status_category THEN
      RETURN NEW;
    END IF;
  END IF;

  actor := COALESCE(auth.uid(), NEW.cr_decided_by);

  IF NEW.actual_frontend_hours < NEW.current_fe_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'FE', NEW.current_fe_estimate, NEW.actual_frontend_hours,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_fe_estimate := NEW.actual_frontend_hours;
  END IF;

  IF NEW.actual_backend_hours < NEW.current_be_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'BE', NEW.current_be_estimate, NEW.actual_backend_hours,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_be_estimate := NEW.actual_backend_hours;
  END IF;

  IF NEW.actual_project_hours < NEW.current_project_estimate THEN
    IF actor IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_at, decided_by)
      VALUES
        (NEW.id, actor, 'Project', NEW.current_project_estimate, NEW.actual_project_hours,
         'Auto-snapped at Dev Done', 'approved', now(), actor);
    END IF;
    NEW.current_project_estimate := NEW.actual_project_hours;
  END IF;

  RETURN NEW;
END;
$function$;