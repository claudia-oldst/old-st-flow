
-- 1. Make fe_status / be_status nullable, drop defaults
ALTER TABLE public.tickets
  ALTER COLUMN fe_status DROP NOT NULL,
  ALTER COLUMN fe_status DROP DEFAULT,
  ALTER COLUMN be_status DROP NOT NULL,
  ALTER COLUMN be_status DROP DEFAULT;

-- 2. Backfill: null out sides with no assignee
UPDATE public.tickets t SET fe_status = NULL
WHERE fe_status IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.slot = 'FE');

UPDATE public.tickets t SET be_status = NULL
WHERE be_status IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.slot = 'BE');

-- 3. Update derivation: treat NULL as 'todo' for matching
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
  fe_or_be_changed boolean;
BEGIN
  IF NEW.ticket_type = 'Proj' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    fe_or_be_changed := true;
  ELSE
    fe_or_be_changed := (NEW.fe_status IS DISTINCT FROM OLD.fe_status)
                     OR (NEW.be_status IS DISTINCT FROM OLD.be_status);
  END IF;

  IF fe_or_be_changed AND NEW.project_status_override THEN
    NEW.project_status_override := false;
  END IF;

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

-- 4. Repoint the todo+todo rule to BACKLOG
UPDATE public.status_derivation_rules
SET status_id = (SELECT id FROM public.statuses WHERE name = 'BACKLOG' AND category = 'backlog' LIMIT 1)
WHERE fe_statuses = ARRAY['todo']::public.discipline_status[]
  AND be_statuses = ARRAY['todo']::public.discipline_status[]
  AND operator = 'AND';

-- 5. Assignee sync trigger
CREATE OR REPLACE FUNCTION public.sync_ticket_discipline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_id uuid;
  v_slot public.assignee_slot;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_ticket_id := NEW.ticket_id;
    v_slot := NEW.slot;
  ELSE
    v_ticket_id := OLD.ticket_id;
    v_slot := OLD.slot;
  END IF;

  IF v_slot = 'FE' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.tickets
        SET fe_status = 'todo'
        WHERE id = v_ticket_id AND fe_status IS NULL;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.ticket_assignees WHERE ticket_id = v_ticket_id AND slot = 'FE') THEN
        UPDATE public.tickets SET fe_status = NULL WHERE id = v_ticket_id;
      END IF;
    END IF;
  ELSIF v_slot = 'BE' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.tickets
        SET be_status = 'todo'
        WHERE id = v_ticket_id AND be_status IS NULL;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.ticket_assignees WHERE ticket_id = v_ticket_id AND slot = 'BE') THEN
        UPDATE public.tickets SET be_status = NULL WHERE id = v_ticket_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS sync_ticket_discipline_status_ins ON public.ticket_assignees;
CREATE TRIGGER sync_ticket_discipline_status_ins
AFTER INSERT ON public.ticket_assignees
FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_discipline_status();

DROP TRIGGER IF EXISTS sync_ticket_discipline_status_del ON public.ticket_assignees;
CREATE TRIGGER sync_ticket_discipline_status_del
AFTER DELETE ON public.ticket_assignees
FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_discipline_status();

-- 6. Reapply to refresh existing tickets
SELECT public.reapply_status_rules();
