-- 1. Backfill legacy child formatted_ids that are missing the dash
UPDATE public.tickets c
   SET formatted_id = p.formatted_id || ':' || LPAD(c.bug_sub_number::text, 2, '0')
  FROM public.tickets p
 WHERE c.parent_ticket_id = p.id
   AND c.bug_sub_number IS NOT NULL
   AND c.formatted_id IS DISTINCT FROM p.formatted_id || ':' || LPAD(c.bug_sub_number::text, 2, '0');

-- 2. Defensive backfill: null out any orphan parent_ticket_id refs before adding FK
UPDATE public.tickets t
   SET parent_ticket_id = NULL,
       bug_sub_number   = NULL
 WHERE parent_ticket_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.tickets p WHERE p.id = t.parent_ticket_id);

-- 3. Add real FK on parent_ticket_id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_parent_ticket_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_parent_ticket_id_fkey
      FOREIGN KEY (parent_ticket_id) REFERENCES public.tickets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Loosen enforce_bug_parent: allow Standard/CR/Bug as children, reject Proj
CREATE OR REPLACE FUNCTION public.enforce_bug_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  p_type public.ticket_type;
  p_project uuid;
  p_formatted text;
  next_sub int;
  acr text;
  parent_changed boolean;
BEGIN
  IF NEW.parent_ticket_id IS NOT NULL THEN
    -- Proj tickets cannot have a parent. Standard, CR, and Bug all can.
    IF NEW.ticket_type = 'Proj' THEN
      RAISE EXCEPTION 'Proj tickets cannot have a parent ticket';
    END IF;

    SELECT ticket_type, project_id, formatted_id
      INTO p_type, p_project, p_formatted
      FROM public.tickets WHERE id = NEW.parent_ticket_id;

    IF p_type IS NULL THEN
      RAISE EXCEPTION 'Parent ticket % not found', NEW.parent_ticket_id;
    END IF;
    IF p_project <> NEW.project_id THEN
      RAISE EXCEPTION 'Parent ticket must belong to the same project';
    END IF;
    IF p_type NOT IN ('Standard','CR') THEN
      RAISE EXCEPTION 'Parent ticket must be Standard or CR (got %)', p_type;
    END IF;
    IF NEW.id = NEW.parent_ticket_id THEN
      RAISE EXCEPTION 'Ticket cannot be its own parent';
    END IF;

    parent_changed := (TG_OP = 'INSERT')
      OR (OLD.parent_ticket_id IS DISTINCT FROM NEW.parent_ticket_id);

    IF parent_changed OR NEW.bug_sub_number IS NULL THEN
      SELECT COALESCE(MAX(bug_sub_number), 0) + 1
        INTO next_sub
        FROM public.tickets
        WHERE parent_ticket_id = NEW.parent_ticket_id
          AND id IS DISTINCT FROM NEW.id;
      NEW.bug_sub_number := next_sub;
      NEW.formatted_id := p_formatted || ':' || LPAD(next_sub::text, 2, '0');
    END IF;
  ELSE
    -- No parent: clear sub-number; if previously had a parent, regenerate normal id.
    IF TG_OP = 'UPDATE' AND OLD.parent_ticket_id IS NOT NULL THEN
      NEW.bug_sub_number := NULL;
      SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
      NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::text, 3, '0');
    ELSE
      NEW.bug_sub_number := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;