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
  v_backlog uuid;
BEGIN
  IF NEW.ticket_type = 'Proj' THEN
    RETURN NEW;
  END IF;

  -- New tickets have no assignees yet: dev status starts blank.
  -- The assignee trigger sets 'todo' when a side is first assigned.
  IF TG_OP = 'INSERT' THEN
    NEW.fe_status := NULL;
    NEW.be_status := NULL;
  END IF;

  IF NEW.project_status_override THEN
    RETURN NEW;
  END IF;

  -- Brand-new, fully unassigned ticket with no time logged -> BACKLOG.
  IF TG_OP = 'INSERT' AND NEW.fe_status IS NULL AND NEW.be_status IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.time_logs WHERE ticket_id = NEW.id) THEN
    SELECT id INTO v_backlog FROM public.statuses
      WHERE name = 'BACKLOG' AND category = 'backlog' ORDER BY position LIMIT 1;
    IF v_backlog IS NOT NULL THEN
      NEW.status_id := v_backlog;
      RETURN NEW;
    END IF;
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