-- Update apply_time_log to handle the new "Project" discipline
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
      actual_overhead_hours = actual_overhead_hours + CASE WHEN NEW.discipline = 'Overhead' THEN NEW.hours ELSE 0 END,
      actual_project_hours  = actual_project_hours  + CASE WHEN NEW.discipline = 'Project' THEN NEW.hours ELSE 0 END
    WHERE id = NEW.ticket_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tickets SET
      actual_frontend_hours = GREATEST(0, actual_frontend_hours - CASE WHEN OLD.discipline = 'FE' THEN OLD.hours ELSE 0 END),
      actual_backend_hours  = GREATEST(0, actual_backend_hours  - CASE WHEN OLD.discipline = 'BE' THEN OLD.hours ELSE 0 END),
      actual_overhead_hours = GREATEST(0, actual_overhead_hours - CASE WHEN OLD.discipline = 'Overhead' THEN OLD.hours ELSE 0 END),
      actual_project_hours  = GREATEST(0, actual_project_hours  - CASE WHEN OLD.discipline = 'Project' THEN OLD.hours ELSE 0 END)
    WHERE id = OLD.ticket_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Update validate_ticket_assignee to allow the new "Project" slot for any project member
CREATE OR REPLACE FUNCTION public.validate_ticket_assignee()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  proj UUID;
  member_role public.project_role;
BEGIN
  SELECT project_id INTO proj FROM public.tickets WHERE id = NEW.ticket_id;
  IF proj IS NULL THEN
    RAISE EXCEPTION 'Ticket % not found', NEW.ticket_id;
  END IF;

  SELECT role INTO member_role
    FROM public.project_members
    WHERE project_id = proj AND user_id = NEW.user_id;

  IF member_role IS NULL THEN
    RAISE EXCEPTION 'User must be a project member before being assigned to a ticket';
  END IF;

  IF NEW.slot = 'FE' AND member_role NOT IN ('Frontend', 'Fullstack') THEN
    RAISE EXCEPTION 'FE slot requires Frontend or Fullstack role (got %)', member_role;
  END IF;

  IF NEW.slot = 'BE' AND member_role NOT IN ('Backend', 'Fullstack') THEN
    RAISE EXCEPTION 'BE slot requires Backend or Fullstack role (got %)', member_role;
  END IF;

  -- 'Other' and 'Project' slots accept any role.

  RETURN NEW;
END;
$function$;

-- Update derive_project_status so Proj tickets aren't auto-derived from FE/BE
CREATE OR REPLACE FUNCTION public.derive_project_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  derived uuid;
BEGIN
  IF NEW.project_status_override THEN
    RETURN NEW;
  END IF;

  -- Proj tickets manage their own status manually.
  IF NEW.ticket_type = 'Proj' THEN
    RETURN NEW;
  END IF;

  IF NEW.fe_status = 'done' AND NEW.be_status = 'done' THEN
    derived := public.first_status_in_category('done');
  ELSIF NEW.fe_status = 'in_progress' OR NEW.be_status = 'in_progress'
        OR (NEW.fe_status = 'done' AND NEW.be_status <> 'done')
        OR (NEW.be_status = 'done' AND NEW.fe_status <> 'done') THEN
    derived := public.first_status_in_category('active');
  ELSE
    derived := public.first_status_in_category('backlog');
  END IF;

  IF derived IS NOT NULL THEN
    NEW.status_id := derived;
  END IF;
  RETURN NEW;
END;
$function$;
