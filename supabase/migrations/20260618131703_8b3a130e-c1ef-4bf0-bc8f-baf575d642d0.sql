CREATE OR REPLACE FUNCTION public.sync_ticket_formatted_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.acronym IS DISTINCT FROM OLD.acronym THEN

    UPDATE public.tickets
    SET formatted_id = NEW.acronym || '-' || LPAD(ticket_number::text, 3, '0')
    WHERE project_id = NEW.id
      AND parent_ticket_id IS NULL;

    UPDATE public.tickets
    SET formatted_id = NEW.acronym || SUBSTRING(formatted_id FROM LENGTH(OLD.acronym) + 1)
    WHERE project_id = NEW.id
      AND parent_ticket_id IS NOT NULL;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_formatted_ids ON public.projects;

CREATE TRIGGER trg_sync_formatted_ids
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_ticket_formatted_ids();