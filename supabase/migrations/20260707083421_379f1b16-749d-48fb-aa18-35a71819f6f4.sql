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

  -- Resolve actor as a team_members.id (FK target), not an auth uid.
  SELECT id INTO actor FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
  IF actor IS NULL THEN
    actor := NEW.cr_decided_by;
  END IF;

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

CREATE OR REPLACE FUNCTION public.trim_estimates_on_done()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Resolve attributed team member (FK to team_members.id).
  SELECT id INTO attributed_user FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
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

  IF NEW.current_fe_estimate > NEW.actual_frontend_hours THEN
    IF attributed_user IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
      VALUES
        (NEW.id, attributed_user, 'FE'::public.assignee_slot,
         NEW.current_fe_estimate, NEW.actual_frontend_hours,
         'Auto-trimmed to actuals on completion', 'approved',
         attributed_user, now());
    END IF;
    NEW.current_fe_estimate := NEW.actual_frontend_hours;
  END IF;

  IF NEW.current_be_estimate > NEW.actual_backend_hours THEN
    IF attributed_user IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
      VALUES
        (NEW.id, attributed_user, 'BE'::public.assignee_slot,
         NEW.current_be_estimate, NEW.actual_backend_hours,
         'Auto-trimmed to actuals on completion', 'approved',
         attributed_user, now());
    END IF;
    NEW.current_be_estimate := NEW.actual_backend_hours;
  END IF;

  IF NEW.current_project_estimate > NEW.actual_project_hours THEN
    IF attributed_user IS NOT NULL THEN
      INSERT INTO public.ticket_estimate_changes
        (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by, decided_at)
      VALUES
        (NEW.id, attributed_user, 'Project'::public.assignee_slot,
         NEW.current_project_estimate, NEW.actual_project_hours,
         'Auto-trimmed to actuals on completion', 'approved',
         attributed_user, now());
    END IF;
    NEW.current_project_estimate := NEW.actual_project_hours;
  END IF;

  RETURN NEW;
END;
$function$;