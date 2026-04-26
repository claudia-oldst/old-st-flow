-- 1. Drop the actual_overhead_hours column
ALTER TABLE public.tickets DROP COLUMN IF EXISTS actual_overhead_hours;

-- 2. Reassign every existing "Other" assignee row to the "Project" slot
UPDATE public.ticket_assignees SET slot = 'Project' WHERE slot = 'Other';
-- ticket_estimate_changes.discipline also uses assignee_slot enum; remap any 'Other' values too
UPDATE public.ticket_estimate_changes SET discipline = 'Project' WHERE discipline = 'Other';

-- 3. Recreate assignee_slot enum without 'Other'
ALTER TYPE public.assignee_slot RENAME TO assignee_slot_old;
CREATE TYPE public.assignee_slot AS ENUM ('FE', 'BE', 'Project');

ALTER TABLE public.ticket_assignees
  ALTER COLUMN slot TYPE public.assignee_slot
  USING slot::text::public.assignee_slot;

ALTER TABLE public.ticket_estimate_changes
  ALTER COLUMN discipline TYPE public.assignee_slot
  USING discipline::text::public.assignee_slot;

DROP TYPE public.assignee_slot_old;

-- 4. Recreate log_discipline enum without 'Overhead'
DROP TRIGGER IF EXISTS apply_time_log_trigger ON public.time_logs;

ALTER TYPE public.log_discipline RENAME TO log_discipline_old;
CREATE TYPE public.log_discipline AS ENUM ('FE', 'BE', 'Project');

ALTER TABLE public.time_logs
  ALTER COLUMN discipline TYPE public.log_discipline
  USING discipline::text::public.log_discipline;

ALTER TABLE public.active_timers
  ALTER COLUMN discipline TYPE public.log_discipline
  USING discipline::text::public.log_discipline;

DROP TYPE public.log_discipline_old;

-- 5. Recreate apply_time_log() without the Overhead branch
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

CREATE TRIGGER apply_time_log_trigger
  AFTER INSERT OR DELETE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_time_log();

-- 6. Update validate_ticket_assignee()
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

  -- 'Project' slot accepts any project member.

  RETURN NEW;
END;
$function$;