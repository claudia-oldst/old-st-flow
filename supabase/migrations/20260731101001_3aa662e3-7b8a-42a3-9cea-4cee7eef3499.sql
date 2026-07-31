CREATE OR REPLACE FUNCTION public.get_client_portal_gantt(_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  proj public.projects%ROWTYPE;
  hashed text;
  result jsonb;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  hashed := encode(digest(_hash, 'sha256'), 'hex');

  SELECT * INTO proj FROM public.projects
   WHERE client_portal_hash_sha = hashed
      OR client_portal_hash = _hash
   LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL OR proj.is_archived THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'project', jsonb_build_object('id', proj.id, 'name', proj.name),
    'sprints', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'project_id', s.project_id,
        'sprint_number', s.sprint_number,
        'name', s.name,
        'start_date', s.start_date,
        'end_date', s.end_date
      ) ORDER BY s.start_date)
      FROM public.sprints s WHERE s.project_id = proj.id
    ), '[]'::jsonb),
    'epics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name) ORDER BY e.epic_name)
      FROM public.project_epics e WHERE e.project_id = proj.id
    ), '[]'::jsonb),
    'tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'epic_id', t.epic_id,
        'fe_status', t.fe_status,
        'be_status', t.be_status,
        'planned_sprint_fe_id', t.planned_sprint_fe_id,
        'planned_sprint_be_id', t.planned_sprint_be_id
      ))
      FROM public.tickets t
      WHERE t.project_id = proj.id
        AND t.ticket_type <> 'Proj'
        AND t.created_at <= proj.client_visibility_cutoff
        AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
    ), '[]'::jsonb),
    'sprint_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ticket_id', st.ticket_id,
        'sprint_id', st.sprint_id,
        'discipline', st.discipline
      ))
      FROM public.sprint_tickets st
      JOIN public.sprints s ON s.id = st.sprint_id
      WHERE s.project_id = proj.id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_client_portal_gantt(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_portal_gantt(text) TO anon, authenticated, service_role;