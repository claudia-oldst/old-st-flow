-- Add epic_id to tickets pointing at project_epics
ALTER TABLE public.tickets
  ADD COLUMN epic_id BIGINT NULL REFERENCES public.project_epics(id) ON DELETE SET NULL;

CREATE INDEX idx_tickets_epic_id ON public.tickets(epic_id);

-- Validation trigger: epic must belong to the same project as the ticket
CREATE OR REPLACE FUNCTION public.validate_ticket_epic()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  epic_project UUID;
BEGIN
  IF NEW.epic_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT project_id INTO epic_project FROM public.project_epics WHERE id = NEW.epic_id;
  IF epic_project IS NULL THEN
    RAISE EXCEPTION 'Epic % not found', NEW.epic_id;
  END IF;
  IF epic_project <> NEW.project_id THEN
    RAISE EXCEPTION 'Epic must belong to the same project as the ticket';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_ticket_epic_trg
BEFORE INSERT OR UPDATE OF epic_id, project_id ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.validate_ticket_epic();