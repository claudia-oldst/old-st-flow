CREATE OR REPLACE FUNCTION public.derive_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  fe_effective public.discipline_status;
  be_effective public.discipline_status;
  fe_match boolean;
  be_match boolean;
BEGIN
  IF NEW.ticket_type = 'Proj' THEN
    RETURN NEW;
  END IF;

  -- A manually-set project status is sticky: it stays until reset to Auto.
  -- FE/BE changes no longer clear the override or re-derive the status.
  IF NEW.project_status_override THEN
    RETURN NEW;
  END IF;

  fe_effective := COALESCE(NEW.fe_status, 'todo'::public.discipline_status);
  be_effective := COALESCE(NEW.be_status, 'todo'::public.discipline_status);

  FOR r IN
    SELECT fe_statuses, be_statuses, operator, status_id
    FROM public.status_derivation_rules
    ORDER BY position ASC, created_at ASC
  LOOP
    fe_match := cardinality(r.fe_statuses) = 0 OR fe_effective = ANY(r.fe_statuses);
    be_match := cardinality(r.be_statuses) = 0 OR be_effective = ANY(r.be_statuses);

    IF (r.operator = 'AND' AND fe_match AND be_match)
       OR (r.operator = 'OR' AND (fe_match OR be_match)) THEN
      NEW.status_id := r.status_id;
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.reapply_status_rules();