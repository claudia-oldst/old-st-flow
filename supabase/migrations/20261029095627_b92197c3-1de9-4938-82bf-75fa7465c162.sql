CREATE OR REPLACE FUNCTION public.before_ticket_insert()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE next_num INT; acr TEXT; default_status UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only act when a Feedback ticket is converted to a real type.
    IF OLD.ticket_type::text <> 'Feedback' OR NEW.ticket_type::text = 'Feedback' THEN RETURN NEW; END IF;
    SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO next_num FROM public.tickets WHERE project_id = NEW.project_id;
    NEW.ticket_number := next_num;
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position FROM public.tickets
      WHERE project_id = NEW.project_id AND ticket_type::text <> 'Feedback';
    SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
    NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::TEXT, 3, '0');
    RETURN NEW;
  END IF;

  IF NEW.ticket_type::text = 'Feedback' THEN
    -- Feedback tickets take no project number/prefix; negative numbers keep the sequence untouched.
    SELECT LEAST(COALESCE(MIN(ticket_number), 0), 0) - 1 INTO next_num FROM public.tickets WHERE project_id = NEW.project_id;
    NEW.ticket_number := next_num;
    NEW.formatted_id := 'FB-' || abs(next_num);
  ELSE
    IF NEW.ticket_number IS NULL OR NEW.ticket_number <= 0 THEN
      SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO next_num FROM public.tickets WHERE project_id = NEW.project_id;
      NEW.ticket_number := next_num;
    END IF;
    SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
    NEW.formatted_id := acr || '-' || LPAD(NEW.ticket_number::TEXT, 3, '0');
  END IF;

  IF NEW.status_id IS NULL THEN
    SELECT id INTO default_status FROM public.statuses WHERE category = 'backlog' ORDER BY position ASC LIMIT 1;
    NEW.status_id := default_status;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tickets_before_insert ON public.tickets;
CREATE TRIGGER tickets_before_insert BEFORE INSERT OR UPDATE OF ticket_type ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.before_ticket_insert();

CREATE OR REPLACE FUNCTION public.sync_ticket_formatted_ids()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.acronym IS DISTINCT FROM OLD.acronym THEN
    UPDATE public.tickets SET formatted_id = NEW.acronym || '-' || LPAD(ticket_number::text, 3, '0')
    WHERE project_id = NEW.id AND parent_ticket_id IS NULL AND ticket_type::text <> 'Feedback';
    UPDATE public.tickets SET formatted_id = NEW.acronym || SUBSTRING(formatted_id FROM LENGTH(OLD.acronym) + 1)
    WHERE project_id = NEW.id AND parent_ticket_id IS NOT NULL AND ticket_type::text <> 'Feedback';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_proj_ticket_in_sprint()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE t_type public.ticket_type;
BEGIN
  SELECT ticket_type INTO t_type FROM public.tickets WHERE id = NEW.ticket_id;
  IF t_type = 'Proj' THEN RAISE EXCEPTION 'Project-type tickets cannot be added to a sprint'; END IF;
  IF t_type::text = 'Feedback' THEN RAISE EXCEPTION 'Feedback tickets must be converted before adding to a sprint'; END IF;
  RETURN NEW;
END;
$function$;

-- Exclude Feedback tickets from list/portal/billing reports; list_project_tickets can opt in via _filters.feedback.
DO $$
DECLARE fn text; def text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['get_project_portal_preview','get_client_portal','get_client_portal_gantt','get_client_portal_change_requests','portal_billing_payload'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=fn;
    def := replace(def, 'WHERE t.project_id = ', 'WHERE t.ticket_type::text <> ''Feedback'' AND t.project_id = ');
    EXECUTE def;
  END LOOP;
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='list_project_tickets';
  def := replace(def, 'WHERE t.project_id = _project_id', 'WHERE (t.ticket_type::text = ''Feedback'') = COALESCE((_filters->>''feedback'')::boolean, false) AND t.project_id = _project_id');
  EXECUTE def;
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='tickets_github_sync_trg';
  def := regexp_replace(def, 'BEGIN', 'BEGIN
  IF NEW.ticket_type::text = ''Feedback'' THEN RETURN NEW; END IF;');
  EXECUTE def;
END $$;

CREATE OR REPLACE FUNCTION public.convert_feedback_ticket(_ticket_id uuid, _new_type public.ticket_type, _parent_id uuid DEFAULT NULL)
 RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
DECLARE fid text;
BEGIN
  IF NOT public.current_is_pmba() THEN RAISE EXCEPTION 'Only PMBAs can convert feedback tickets'; END IF;
  IF _new_type::text = 'Feedback' THEN RAISE EXCEPTION 'Choose Standard, CR, Bug or Project'; END IF;
  IF _parent_id IS NOT NULL AND _new_type <> 'Bug' THEN RAISE EXCEPTION 'Only Bug tickets can have a parent'; END IF;
  UPDATE public.tickets SET ticket_type = _new_type, parent_ticket_id = _parent_id
   WHERE id = _ticket_id AND ticket_type::text = 'Feedback'
   RETURNING formatted_id INTO fid;
  IF fid IS NULL THEN RAISE EXCEPTION 'Feedback ticket not found'; END IF;
  RETURN fid;
END;
$function$;
REVOKE ALL ON FUNCTION public.convert_feedback_ticket(uuid, public.ticket_type, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_feedback_ticket(uuid, public.ticket_type, uuid) TO authenticated;