
-- Read CR data via portal hash (no auth)
CREATE OR REPLACE FUNCTION public.get_client_portal_change_requests(_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid;
  _result jsonb;
BEGIN
  SELECT id INTO _project_id
  FROM projects
  WHERE client_portal_hash = _hash
  LIMIT 1;

  IF _project_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object('id', p.id, 'acronym', p.acronym, 'name', p.name)
      FROM projects p WHERE p.id = _project_id
    ),
    'epics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name) ORDER BY e.epic_name)
      FROM project_epics e WHERE e.project_id = _project_id
    ), '[]'::jsonb),
    'baseline_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'epic_id', t.epic_id,
        'original_fe_estimate', t.original_fe_estimate,
        'original_be_estimate', t.original_be_estimate,
        'original_project_estimate', t.original_project_estimate,
        'current_fe_estimate', t.current_fe_estimate,
        'current_be_estimate', t.current_be_estimate,
        'current_project_estimate', t.current_project_estimate,
        'actual_frontend_hours', t.actual_frontend_hours,
        'actual_backend_hours', t.actual_backend_hours,
        'actual_project_hours', t.actual_project_hours
      ))
      FROM tickets t
      WHERE t.project_id = _project_id AND t.ticket_type <> 'CR'
    ), '[]'::jsonb),
    'cr_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'formatted_id', t.formatted_id,
        'title', t.title,
        'ticket_type', t.ticket_type,
        'epic_id', t.epic_id,
        'acceptance_criteria', t.acceptance_criteria,
        'current_fe_estimate', t.current_fe_estimate,
        'current_be_estimate', t.current_be_estimate,
        'current_project_estimate', t.current_project_estimate,
        'original_fe_estimate', t.original_fe_estimate,
        'original_be_estimate', t.original_be_estimate,
        'original_project_estimate', t.original_project_estimate,
        'actual_frontend_hours', t.actual_frontend_hours,
        'actual_backend_hours', t.actual_backend_hours,
        'actual_project_hours', t.actual_project_hours,
        'cr_approval', t.cr_approval,
        'cr_decided_at', t.cr_decided_at,
        'created_at', t.created_at
      ))
      FROM tickets t
      WHERE t.project_id = _project_id AND t.ticket_type = 'CR'
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_change_requests(text) TO anon, authenticated;

-- Approve a CR via portal hash (no auth)
CREATE OR REPLACE FUNCTION public.client_approve_cr(_hash text, _ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid;
  _updated int;
BEGIN
  SELECT id INTO _project_id
  FROM projects
  WHERE client_portal_hash = _hash
  LIMIT 1;

  IF _project_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE tickets
  SET cr_approval = 'approved',
      cr_decided_at = now(),
      cr_decided_by = NULL
  WHERE id = _ticket_id
    AND project_id = _project_id
    AND ticket_type = 'CR'
    AND cr_approval = 'pending';

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_approve_cr(text, uuid) TO anon, authenticated;
