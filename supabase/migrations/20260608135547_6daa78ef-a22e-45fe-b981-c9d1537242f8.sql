-- Allow estimate columns to be NULL (blank = unestimated; 0 counts as estimated)
ALTER TABLE public.tickets ALTER COLUMN original_fe_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN original_fe_estimate DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN original_be_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN original_be_estimate DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN original_project_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN original_project_estimate DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN current_fe_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN current_fe_estimate DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN current_be_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN current_be_estimate DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN current_project_estimate DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN current_project_estimate DROP DEFAULT;

-- Updated Proj-ticket guard: treat NULL as "no value" rather than coercing.
CREATE OR REPLACE FUNCTION public.enforce_proj_ticket_zero_fe_be()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ticket_type = 'Proj' THEN
    -- Fold any FE/BE original estimate into project estimate, then null FE/BE.
    IF COALESCE(NEW.original_fe_estimate, 0) <> 0 OR COALESCE(NEW.original_be_estimate, 0) <> 0 THEN
      NEW.original_project_estimate := COALESCE(NEW.original_project_estimate, 0)
        + COALESCE(NEW.original_fe_estimate, 0) + COALESCE(NEW.original_be_estimate, 0);
    END IF;
    NEW.original_fe_estimate := NULL;
    NEW.original_be_estimate := NULL;

    IF COALESCE(NEW.current_fe_estimate, 0) <> 0 OR COALESCE(NEW.current_be_estimate, 0) <> 0 THEN
      NEW.current_project_estimate := COALESCE(NEW.current_project_estimate, 0)
        + COALESCE(NEW.current_fe_estimate, 0) + COALESCE(NEW.current_be_estimate, 0);
    END IF;
    NEW.current_fe_estimate := NULL;
    NEW.current_be_estimate := NULL;

    NEW.actual_frontend_hours := 0;
    NEW.actual_backend_hours := 0;
  END IF;
  RETURN NEW;
END;
$function$;