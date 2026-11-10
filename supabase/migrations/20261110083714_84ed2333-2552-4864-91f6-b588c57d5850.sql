CREATE OR REPLACE FUNCTION public.enforce_bug_parent()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  p_type public.ticket_type; p_project uuid; p_formatted text; next_sub int; acr text; parent_changed boolean;
  feedback_link boolean; cur uuid; depth int := 0;
BEGIN
  IF NEW.parent_ticket_id IS NOT NULL THEN
    IF NEW.ticket_type = 'Proj' THEN
      RAISE EXCEPTION 'Proj tickets cannot have a parent ticket';
    END IF;
    IF NEW.id = NEW.parent_ticket_id THEN RAISE EXCEPTION 'Ticket cannot be its own parent'; END IF;
    SELECT ticket_type, project_id, formatted_id INTO p_type, p_project, p_formatted
      FROM public.tickets WHERE id = NEW.parent_ticket_id;
    IF p_type IS NULL THEN RAISE EXCEPTION 'Parent ticket % not found', NEW.parent_ticket_id; END IF;
    IF p_project <> NEW.project_id THEN RAISE EXCEPTION 'Parent ticket must belong to the same project'; END IF;
    feedback_link := NEW.ticket_type::text = 'Feedback' OR p_type::text = 'Feedback';
    IF feedback_link THEN
      IF p_type = 'Proj' THEN RAISE EXCEPTION 'Proj tickets cannot be a parent'; END IF;
    ELSIF p_type NOT IN ('Standard','CR') THEN
      RAISE EXCEPTION 'Parent ticket must be Standard or CR (got %)', p_type;
    END IF;
    -- loop check
    cur := NEW.parent_ticket_id;
    WHILE cur IS NOT NULL AND depth < 50 LOOP
      IF cur = NEW.id THEN RAISE EXCEPTION 'Linking would create a loop'; END IF;
      SELECT parent_ticket_id INTO cur FROM public.tickets WHERE id = cur;
      depth := depth + 1;
    END LOOP;
    parent_changed := (TG_OP = 'INSERT') OR (OLD.parent_ticket_id IS DISTINCT FROM NEW.parent_ticket_id)
      OR (TG_OP = 'UPDATE' AND OLD.ticket_type::text = 'Feedback' AND NEW.ticket_type::text <> 'Feedback');
    IF feedback_link THEN
      NEW.bug_sub_number := NULL;
      IF TG_OP = 'UPDATE' AND OLD.bug_sub_number IS NOT NULL AND NEW.ticket_type::text <> 'Feedback' THEN
        SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
        NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::text, GREATEST(3, length(NEW.ticket_number::text)), '0');
      END IF;
    ELSIF parent_changed OR NEW.bug_sub_number IS NULL THEN
      SELECT COALESCE(MAX(bug_sub_number), 0) + 1 INTO next_sub FROM public.tickets
        WHERE parent_ticket_id = NEW.parent_ticket_id AND id IS DISTINCT FROM NEW.id;
      NEW.bug_sub_number := next_sub;
      NEW.formatted_id := p_formatted || ':' || LPAD(next_sub::text, 2, '0');
    END IF;
  ELSE
    IF TG_OP = 'UPDATE' AND OLD.parent_ticket_id IS NOT NULL AND OLD.bug_sub_number IS NOT NULL AND NEW.ticket_type::text <> 'Feedback' THEN
      SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
      NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::text, GREATEST(3, length(NEW.ticket_number::text)), '0');
    END IF;
    NEW.bug_sub_number := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detach_bug_children_before_parent_delete()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE acr text;
BEGIN
  SELECT acronym INTO acr FROM public.projects WHERE id = OLD.project_id;
  UPDATE public.tickets SET parent_ticket_id = NULL, bug_sub_number = NULL
   WHERE parent_ticket_id = OLD.id AND (ticket_type::text = 'Feedback' OR bug_sub_number IS NULL);
  UPDATE public.tickets
     SET parent_ticket_id = NULL, bug_sub_number = NULL,
         formatted_id = acr || '-' || LPAD(ticket_number::text, GREATEST(3, length(ticket_number::text)), '0')
   WHERE parent_ticket_id = OLD.id;
  RETURN OLD;
END;
$function$;