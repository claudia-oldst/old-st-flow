CREATE OR REPLACE FUNCTION public.trim_estimates_on_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_cat public.status_category;
  new_cat public.status_category;
  attributed_user uuid;
BEGIN
  IF NEW.status_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  SELECT category INTO new_cat FROM public.statuses WHERE id = NEW.status_id;
  IF new_cat IS DISTINCT FROM 'done'::public.status_category THEN
    RETURN NEW;
  END IF;

  IF OLD.status_id IS NOT NULL THEN
    SELECT category INTO old_cat FROM public.statuses WHERE id = OLD.status_id;
    IF old_cat = 'done'::public.status_category THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Resolve a user to attribute the auto-trim to.
  attributed_user := auth.uid();
  IF attributed_user IS NULL THEN
    SELECT user_id INTO attributed_user
    FROM public.time_logs
    WHERE ticket_id = NEW.id
    ORDER BY logged_at DESC
    LIMIT 1;
  END IF;
  IF attributed_user IS NULL THEN
    SELECT user_id INTO attributed_user
    FROM public.ticket_assignees
    WHERE ticket_id = NEW.id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- FE
  IF NEW.current_fe_estimate > NEW.actual_frontend_hours THEN
    INSERT INTO public.ticket_estimate_changes
      (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
    VALUES
      (NEW.id, attributed_user, 'FE'::public.assignee_slot,
       NEW.current_fe_estimate, NEW.actual_frontend_hours,
       'Auto-trimmed to actuals on completion', 'approved',
       attributed_user, now());
    NEW.current_fe_estimate := NEW.actual_frontend_hours;
  END IF;

  -- BE
  IF NEW.current_be_estimate > NEW.actual_backend_hours THEN
    INSERT INTO public.ticket_estimate_changes
      (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
    VALUES
      (NEW.id, attributed_user, 'BE'::public.assignee_slot,
       NEW.current_be_estimate, NEW.actual_backend_hours,
       'Auto-trimmed to actuals on completion', 'approved',
       attributed_user, now());
    NEW.current_be_estimate := NEW.actual_backend_hours;
  END IF;

  -- Project
  IF NEW.current_project_estimate > NEW.actual_project_hours THEN
    INSERT INTO public.ticket_estimate_changes
      (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
    VALUES
      (NEW.id, attributed_user, 'Project'::public.assignee_slot,
       NEW.current_project_estimate, NEW.actual_project_hours,
       'Auto-trimmed to actuals on completion', 'approved',
       attributed_user, now());
    NEW.current_project_estimate := NEW.actual_project_hours;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trim_estimates_on_done ON public.tickets;
CREATE TRIGGER trim_estimates_on_done
BEFORE UPDATE OF status_id ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.trim_estimates_on_done();