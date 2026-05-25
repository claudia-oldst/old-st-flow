CREATE OR REPLACE FUNCTION public.list_project_tickets(_project_id uuid, _filters jsonb DEFAULT '{}'::jsonb, _search text DEFAULT NULL::text, _sort_col text DEFAULT 'position'::text, _sort_dir text DEFAULT 'asc'::text, _page integer DEFAULT 1, _page_size integer DEFAULT 400)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _offset int;
  _limit int;
  _sort text;
  _dir text;
  _types text[];
  _status_ids uuid[];
  _status_none boolean;
  _epic_ids bigint[];
  _epic_none boolean;
  _versions text[];
  _version_none boolean;
  _fe_statuses text[];
  _be_statuses text[];
  _assignee_ids uuid[];
  _assignee_unassigned boolean;
  _filter_mine_user uuid;
  _health text[];
  _q text;
BEGIN
  _limit := GREATEST(1, LEAST(_page_size, 1000));
  _offset := GREATEST(0, (_page - 1)) * _limit;

  _sort := lower(coalesce(_sort_col, 'position'));
  IF _sort NOT IN (
    'position','ticket_number','created_at','updated_at',
    'current_fe_estimate','current_be_estimate','current_project_estimate',
    'actual_frontend_hours','actual_backend_hours','actual_project_hours',
    'title','formatted_id'
  ) THEN
    _sort := 'position';
  END IF;
  _dir := lower(coalesce(_sort_dir, 'asc'));
  IF _dir NOT IN ('asc','desc') THEN _dir := 'asc'; END IF;

  _types := CASE WHEN jsonb_typeof(_filters->'types') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_filters->'types')) END;

  IF jsonb_typeof(_filters->'statusIds') = 'array' THEN
    _status_none := (_filters->'statusIds') ? '_none';
    _status_ids := ARRAY(
      SELECT v::uuid FROM jsonb_array_elements_text(_filters->'statusIds') v
      WHERE v <> '_none'
    );
  END IF;

  IF jsonb_typeof(_filters->'epicIds') = 'array' THEN
    _epic_none := (_filters->'epicIds') ? '_none';
    _epic_ids := ARRAY(
      SELECT v::bigint FROM jsonb_array_elements_text(_filters->'epicIds') v
      WHERE v <> '_none'
    );
  END IF;

  IF jsonb_typeof(_filters->'versions') = 'array' THEN
    _version_none := (_filters->'versions') ? '_none';
    _versions := ARRAY(
      SELECT v FROM jsonb_array_elements_text(_filters->'versions') v
      WHERE v <> '_none'
    );
  END IF;

  _fe_statuses := CASE WHEN jsonb_typeof(_filters->'feStatuses') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_filters->'feStatuses')) END;
  _be_statuses := CASE WHEN jsonb_typeof(_filters->'beStatuses') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_filters->'beStatuses')) END;

  IF jsonb_typeof(_filters->'assigneeIds') = 'array' THEN
    _assignee_unassigned := (_filters->'assigneeIds') ? '_unassigned';
    _assignee_ids := ARRAY(
      SELECT v::uuid FROM jsonb_array_elements_text(_filters->'assigneeIds') v
      WHERE v <> '_unassigned'
    );
  END IF;

  IF (_filters ? 'filterMineUserId') AND nullif(_filters->>'filterMineUserId','') IS NOT NULL THEN
    _filter_mine_user := (_filters->>'filterMineUserId')::uuid;
  END IF;

  _health := CASE WHEN jsonb_typeof(_filters->'health') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_filters->'health')) END;

  _q := nullif(trim(coalesce(_search, '')), '');

  RETURN (
    WITH base AS (
      SELECT t.*
      FROM public.tickets t
      WHERE t.project_id = _project_id
        AND (_q IS NULL OR t.title ILIKE '%'||_q||'%' OR t.formatted_id ILIKE '%'||_q||'%')
        AND (_types IS NULL OR cardinality(_types) = 0 OR t.ticket_type::text = ANY(_types))
        AND (
          (_status_ids IS NULL OR cardinality(_status_ids) = 0) AND coalesce(_status_none, false) = false
          OR (_status_ids IS NOT NULL AND cardinality(_status_ids) > 0 AND t.status_id = ANY(_status_ids))
          OR (coalesce(_status_none, false) AND t.status_id IS NULL)
        )
        AND (
          (_epic_ids IS NULL OR cardinality(_epic_ids) = 0) AND coalesce(_epic_none, false) = false
          OR (_epic_ids IS NOT NULL AND cardinality(_epic_ids) > 0 AND t.epic_id = ANY(_epic_ids))
          OR (coalesce(_epic_none, false) AND t.epic_id IS NULL)
        )
        AND (
          (_versions IS NULL OR cardinality(_versions) = 0) AND coalesce(_version_none, false) = false
          OR (_versions IS NOT NULL AND cardinality(_versions) > 0 AND t.version = ANY(_versions))
          OR (coalesce(_version_none, false) AND (t.version IS NULL OR btrim(t.version) = ''))
        )
        AND (
          _fe_statuses IS NULL OR cardinality(_fe_statuses) = 0
          OR (
            t.fe_status::text = ANY(_fe_statuses)
            AND EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.slot = 'FE')
          )
        )
        AND (
          _be_statuses IS NULL OR cardinality(_be_statuses) = 0
          OR (
            t.be_status::text = ANY(_be_statuses)
            AND EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.slot = 'BE')
          )
        )
        AND (
          (_assignee_ids IS NULL OR cardinality(_assignee_ids) = 0) AND coalesce(_assignee_unassigned, false) = false
          OR (_assignee_ids IS NOT NULL AND cardinality(_assignee_ids) > 0
              AND EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.user_id = ANY(_assignee_ids)))
          OR (coalesce(_assignee_unassigned, false)
              AND NOT EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id))
        )
        AND (
          _filter_mine_user IS NULL
          OR EXISTS (SELECT 1 FROM public.ticket_assignees a WHERE a.ticket_id = t.id AND a.user_id = _filter_mine_user)
        )
        AND (
          _health IS NULL OR cardinality(_health) = 0
          OR EXISTS (
            SELECT 1
            FROM (
              VALUES
                ('FE'::text, t.actual_frontend_hours, t.current_fe_estimate),
                ('BE'::text, t.actual_backend_hours, t.current_be_estimate),
                ('Project'::text, t.actual_project_hours, t.current_project_estimate)
            ) AS hv(slot, actual, est)
            WHERE
              (
                (hv.slot IN ('FE','BE') AND EXISTS (
                  SELECT 1 FROM public.ticket_assignees a
                  WHERE a.ticket_id = t.id AND a.slot::text = hv.slot
                ))
                OR (hv.slot = 'Project' AND t.ticket_type = 'Proj')
              )
              AND hv.est > 0
              AND (
                ('good' = ANY(_health) AND (hv.actual / hv.est) < 0.8)
                OR ('warn' = ANY(_health) AND (hv.actual / hv.est) >= 0.8 AND (hv.actual / hv.est) < 1.0)
                OR ('bad' = ANY(_health) AND (hv.actual / hv.est) >= 1.0)
              )
          )
        )
    ),
    counted AS (SELECT count(*)::int AS n FROM base),
    page AS (
      SELECT b.*
      FROM base b
      ORDER BY
        CASE WHEN _sort = 'position' AND _dir = 'asc' THEN b.position END ASC,
        CASE WHEN _sort = 'position' AND _dir = 'desc' THEN b.position END DESC,
        CASE WHEN _sort = 'ticket_number' AND _dir = 'asc' THEN b.ticket_number END ASC,
        CASE WHEN _sort = 'ticket_number' AND _dir = 'desc' THEN b.ticket_number END DESC,
        CASE WHEN _sort = 'created_at' AND _dir = 'asc' THEN b.created_at END ASC,
        CASE WHEN _sort = 'created_at' AND _dir = 'desc' THEN b.created_at END DESC,
        CASE WHEN _sort = 'updated_at' AND _dir = 'asc' THEN b.updated_at END ASC,
        CASE WHEN _sort = 'updated_at' AND _dir = 'desc' THEN b.updated_at END DESC,
        CASE WHEN _sort = 'current_fe_estimate' AND _dir = 'asc' THEN b.current_fe_estimate END ASC,
        CASE WHEN _sort = 'current_fe_estimate' AND _dir = 'desc' THEN b.current_fe_estimate END DESC,
        CASE WHEN _sort = 'current_be_estimate' AND _dir = 'asc' THEN b.current_be_estimate END ASC,
        CASE WHEN _sort = 'current_be_estimate' AND _dir = 'desc' THEN b.current_be_estimate END DESC,
        CASE WHEN _sort = 'current_project_estimate' AND _dir = 'asc' THEN b.current_project_estimate END ASC,
        CASE WHEN _sort = 'current_project_estimate' AND _dir = 'desc' THEN b.current_project_estimate END DESC,
        CASE WHEN _sort = 'actual_frontend_hours' AND _dir = 'asc' THEN b.actual_frontend_hours END ASC,
        CASE WHEN _sort = 'actual_frontend_hours' AND _dir = 'desc' THEN b.actual_frontend_hours END DESC,
        CASE WHEN _sort = 'actual_backend_hours' AND _dir = 'asc' THEN b.actual_backend_hours END ASC,
        CASE WHEN _sort = 'actual_backend_hours' AND _dir = 'desc' THEN b.actual_backend_hours END DESC,
        CASE WHEN _sort = 'actual_project_hours' AND _dir = 'asc' THEN b.actual_project_hours END ASC,
        CASE WHEN _sort = 'actual_project_hours' AND _dir = 'desc' THEN b.actual_project_hours END DESC,
        CASE WHEN _sort = 'title' AND _dir = 'asc' THEN b.title END ASC,
        CASE WHEN _sort = 'title' AND _dir = 'desc' THEN b.title END DESC,
        CASE WHEN _sort = 'formatted_id' AND _dir = 'asc' THEN b.formatted_id END ASC,
        CASE WHEN _sort = 'formatted_id' AND _dir = 'desc' THEN b.formatted_id END DESC,
        b.ticket_number ASC
      LIMIT _limit OFFSET _offset
    )
    SELECT jsonb_build_object(
      'total', (SELECT n FROM counted),
      'rows', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'project_id', p.project_id,
            'ticket_number', p.ticket_number,
            'formatted_id', p.formatted_id,
            'title', p.title,
            'ticket_type', p.ticket_type,
            'status_id', p.status_id,
            'fe_status', p.fe_status,
            'be_status', p.be_status,
            'project_status_override', p.project_status_override,
            'epic_id', p.epic_id,
            'epic', CASE WHEN p.epic_id IS NOT NULL THEN
              (SELECT jsonb_build_object('epic_name', e.epic_name)
                 FROM public.project_epics e WHERE e.id = p.epic_id)
              END,
            'version', p.version,
            'original_fe_estimate', p.original_fe_estimate,
            'original_be_estimate', p.original_be_estimate,
            'original_project_estimate', p.original_project_estimate,
            'current_fe_estimate', p.current_fe_estimate,
            'current_be_estimate', p.current_be_estimate,
            'current_project_estimate', p.current_project_estimate,
            'actual_frontend_hours', p.actual_frontend_hours,
            'actual_backend_hours', p.actual_backend_hours,
            'actual_project_hours', p.actual_project_hours,
            'acceptance_criteria', p.acceptance_criteria,
            'position', p.position,
            'created_at', p.created_at,
            'cr_approval', p.cr_approval,
            'cr_decided_by', p.cr_decided_by,
            'cr_decided_at', p.cr_decided_at,
            'parent_ticket_id', p.parent_ticket_id,
            'bug_sub_number', p.bug_sub_number,
            'parent', CASE WHEN p.parent_ticket_id IS NOT NULL THEN
              (SELECT jsonb_build_object('id', pt.id, 'formatted_id', pt.formatted_id, 'title', pt.title)
                 FROM public.tickets pt WHERE pt.id = p.parent_ticket_id)
              END,
            'assignees', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'user_id', a.user_id,
                'slot', a.slot,
                'created_at', a.created_at,
                'member', (SELECT to_jsonb(tm) FROM public.team_members tm WHERE tm.id = a.user_id)
              ) ORDER BY a.created_at)
              FROM public.ticket_assignees a WHERE a.ticket_id = p.id
            ), '[]'::jsonb)
          )
        )
        FROM page p
      ), '[]'::jsonb)
    )
  );
END;
$function$;