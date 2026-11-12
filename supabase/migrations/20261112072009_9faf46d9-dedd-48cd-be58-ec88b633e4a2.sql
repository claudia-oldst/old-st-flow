CREATE OR REPLACE FUNCTION public.convert_feedback_ticket(_ticket_id uuid, _new_type ticket_type, _parent_id uuid DEFAULT NULL::uuid, _epic_id bigint DEFAULT NULL)
 RETURNS text LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE fid text;
BEGIN
  IF NOT public.current_is_pmba() THEN RAISE EXCEPTION 'Only PMBAs can convert feedback tickets'; END IF;
  IF _new_type::text = 'Feedback' THEN RAISE EXCEPTION 'Choose Standard, CR, Bug or Project'; END IF;
  IF _new_type = 'Bug' AND _parent_id IS NULL THEN RAISE EXCEPTION 'A bug needs a parent ticket'; END IF;
  UPDATE public.tickets SET ticket_type = _new_type,
         parent_ticket_id = _parent_id,
         epic_id = COALESCE(_epic_id, epic_id)
   WHERE id = _ticket_id AND ticket_type::text = 'Feedback'
   RETURNING formatted_id INTO fid;
  IF fid IS NULL THEN RAISE EXCEPTION 'Feedback ticket not found'; END IF;
  RETURN fid;
END;
$function$;
DROP FUNCTION IF EXISTS public.convert_feedback_ticket(uuid, ticket_type, uuid);