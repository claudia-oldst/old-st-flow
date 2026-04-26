-- 1. Add 'Design' to project_role enum
ALTER TYPE public.project_role ADD VALUE IF NOT EXISTS 'Design';

-- 2. Add 'Other' to assignee_slot enum
ALTER TYPE public.assignee_slot ADD VALUE IF NOT EXISTS 'Other';

-- 3. Update validation trigger to allow the new Other slot for any project role
CREATE OR REPLACE FUNCTION public.validate_ticket_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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

  -- 'Other' slot accepts any role (no extra check needed)

  RETURN NEW;
END;
$$;