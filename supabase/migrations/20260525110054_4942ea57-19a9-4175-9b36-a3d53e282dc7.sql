-- Bug → parent ticket linking
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS parent_ticket_id uuid NULL,
  ADD COLUMN IF NOT EXISTS bug_sub_number int NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON public.tickets(parent_ticket_id);

-- Trigger: enforce parent rules and derive formatted_id for parented bugs.
CREATE OR REPLACE FUNCTION public.enforce_bug_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  p_type public.ticket_type;
  p_project uuid;
  p_formatted text;
  next_sub int;
  acr text;
  parent_changed boolean;
BEGIN
  IF NEW.parent_ticket_id IS NOT NULL THEN
    IF NEW.ticket_type <> 'Bug' THEN
      RAISE EXCEPTION 'Only Bug tickets can have a parent ticket';
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
$$;

DROP TRIGGER IF EXISTS trg_enforce_bug_parent ON public.tickets;
CREATE TRIGGER trg_enforce_bug_parent
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bug_parent();

-- When a parent ticket is deleted, detach children and restore their normal formatted_id.
CREATE OR REPLACE FUNCTION public.detach_bug_children_before_parent_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  acr text;
BEGIN
  SELECT acronym INTO acr FROM public.projects WHERE id = OLD.project_id;
  UPDATE public.tickets
     SET parent_ticket_id = NULL,
         bug_sub_number = NULL,
         formatted_id = acr || '-' || LPAD(ticket_number::text, 3, '0')
   WHERE parent_ticket_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_detach_bug_children ON public.tickets;
CREATE TRIGGER trg_detach_bug_children
BEFORE DELETE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.detach_bug_children_before_parent_delete();