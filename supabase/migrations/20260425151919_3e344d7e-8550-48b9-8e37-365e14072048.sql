CREATE OR REPLACE FUNCTION public.before_ticket_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INT;
  acr TEXT;
  default_status UUID;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number <= 0 THEN
    SELECT COALESCE(MAX(ticket_number), 0) + 1
      INTO next_num
      FROM public.tickets
      WHERE project_id = NEW.project_id;
    NEW.ticket_number := next_num;
  END IF;

  SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
  NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::TEXT, 3, '0');

  IF NEW.status_id IS NULL THEN
    SELECT id INTO default_status
      FROM public.statuses
      WHERE category = 'backlog'
      ORDER BY position ASC
      LIMIT 1;
    NEW.status_id := default_status;
  END IF;

  RETURN NEW;
END;
$$;