ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_portal_versions text[];

CREATE OR REPLACE FUNCTION public.get_client_portal(_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  proj public.projects%ROWTYPE;
  cutoff timestamptz;
  rate numeric;
  result jsonb;
  hashed text;
  vers text[];
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  hashed := encode(digest(_hash, 'sha256'), 'hex');

  SELECT * INTO proj FROM public.projects
   WHERE client_portal_hash_sha = hashed
      OR client_portal_hash = _hash
   LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL THEN RETURN NULL; END IF;
  cutoff := proj.client_visibility_cutoff;
  rate := COALESCE(proj.rate_per_hour, 0);
  vers := proj.client_portal_versions;
  IF vers IS NOT NULL AND cardinality(vers) = 0 THEN vers := NULL; END IF;

  WITH ticket_hours AS (
    SELECT tl.ticket_id,
      SUM(CASE WHEN tl.discipline = 'FE' THEN tl.hours ELSE 0 END) AS fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' THEN tl.hours ELSE 0 END) AS be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' THEN tl.hours ELSE 0 END) AS proj_hours
    FROM public.time_logs tl
    WHERE tl.logged_at <= cutoff
    GROUP BY tl.ticket_id
  ),
  ticket_rows AS (
    SELECT
      t.id, t.formatted_id, t.title, t.epic_id,
      t.fe_status, t.be_status, t.ticket_type, t.cr_approval,
      COALESCE(t.current_fe_estimate, 0) AS current_fe_estimate,
      COALESCE(t.current_be_estimate, 0) AS current_be_estimate,
      COALESCE(t.current_project_estimate, 0) AS current_project_estimate,
      COALESCE(t.original_fe_estimate, 0) AS original_fe_estimate,
      COALESCE(t.original_be_estimate, 0) AS original_be_estimate,
      COALESCE(t.original_project_estimate, 0) AS original_project_estimate,
      COALESCE(th.fe_hours, 0) AS actual_fe,
      COALESCE(th.be_hours, 0) AS actual_be,
      COALESCE(th.proj_hours, 0) AS actual_proj,
      s.category AS status_category,
      CASE
        WHEN t.ticket_type = 'CR'
             AND t.cr_approval = 'approved'
             AND COALESCE(t.cr_decided_at, t.created_at) <= cutoff
          THEN true
        ELSE false
      END AS cr_effective,
      (t.ticket_type IS DISTINCT FROM 'CR') AS is_baseline
    FROM public.tickets t
    LEFT JOIN ticket_hours th ON th.ticket_id = t.id
    LEFT JOIN public.statuses s ON s.id = t.status_id
    WHERE t.project_id = proj.id
      AND t.created_at <= cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
  ),
  ticket_contrib AS (
    SELECT
      tr.*,
      CASE WHEN is_baseline THEN current_fe_estimate
           WHEN cr_effective THEN current_fe_estimate
           ELSE 0 END AS c_fe,
      CASE WHEN is_baseline THEN current_be_estimate
           WHEN cr_effective THEN current_be_estimate
           ELSE 0 END AS c_be,
      CASE WHEN is_baseline THEN current_project_estimate
           WHEN cr_effective THEN current_project_estimate
           ELSE 0 END AS c_pr,
      CASE WHEN is_baseline THEN original_fe_estimate ELSE 0 END AS o_fe,
      CASE WHEN is_baseline THEN original_be_estimate ELSE 0 END AS o_be,
      CASE WHEN is_baseline THEN original_project_estimate ELSE 0 END AS o_pr
    FROM ticket_rows tr
  ),
  epic_rows AS (
    SELECT
      e.id, e.epic_name,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline)::int AS total_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'backlog')::int AS backlog_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'active')::int AS in_progress_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'dev done')::int AS dev_done_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'done')::int AS done_tickets,
      COALESCE(SUM(tc.c_fe + tc.c_be + tc.c_pr), 0) AS current_estimate,
      COALESCE(SUM(tc.o_fe + tc.o_be + tc.o_pr), 0) AS original_estimate,
      COALESCE(SUM(tc.actual_fe + tc.actual_be + tc.actual_proj), 0) AS actual_hours
    FROM public.project_epics e
    LEFT JOIN ticket_contrib tc ON tc.epic_id = e.id
    WHERE e.project_id = proj.id
    GROUP BY e.id, e.epic_name
    HAVING vers IS NULL OR COUNT(tc.id) > 0
    ORDER BY e.epic_name NULLS LAST
  ),
  epic_with_summary AS (
    SELECT er.*, pes.pmba_text, pes.ai_draft, pes.included
    FROM epic_rows er
    LEFT JOIN public.project_epic_summaries pes
      ON pes.project_id = proj.id AND pes.epic_id = er.id
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id, 'name', proj.name, 'acronym', proj.acronym,
      'client_name', proj.client_name, 'cutoff', proj.client_visibility_cutoff,
      'rate_per_hour', rate, 'summary', proj.client_summary_published,
      'summary_updated_at', proj.client_summary_updated_at
    ),
    'totals', (
      SELECT jsonb_build_object(
        'tickets_total', COUNT(*) FILTER (WHERE is_baseline),
        'tickets_backlog', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'backlog'),
        'tickets_in_progress', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'active'),
        'tickets_dev_done', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'dev done'),
        'tickets_done', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'done'),
        'fe_actual', COALESCE(SUM(actual_fe), 0),
        'be_actual', COALESCE(SUM(actual_be), 0),
        'proj_actual', COALESCE(SUM(actual_proj), 0),
        'fe_estimate', COALESCE(SUM(c_fe), 0),
        'be_estimate', COALESCE(SUM(c_be), 0),
        'proj_estimate', COALESCE(SUM(c_pr), 0),
        'fe_done', COUNT(*) FILTER (WHERE is_baseline AND fe_status = 'done'),
        'fe_in_progress', COUNT(*) FILTER (WHERE is_baseline AND fe_status IN ('in_progress','for_integration')),
        'fe_todo', COUNT(*) FILTER (WHERE is_baseline AND fe_status = 'todo'),
        'be_done', COUNT(*) FILTER (WHERE is_baseline AND be_status = 'done'),
        'be_in_progress', COUNT(*) FILTER (WHERE is_baseline AND be_status IN ('in_progress','for_integration')),
        'be_todo', COUNT(*) FILTER (WHERE is_baseline AND be_status = 'todo'),
        'original_total', COALESCE(SUM(o_fe + o_be + o_pr), 0),
        'current_total', COALESCE(SUM(c_fe + c_be + c_pr), 0),
        'actual_total', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0),
        'cost_actual', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0) * rate,
        'cost_estimate', COALESCE(SUM(c_fe + c_be + c_pr), 0) * rate
      ) FROM ticket_contrib
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_with_summary)) FROM epic_with_summary), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_project_portal_preview(uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.get_project_portal_preview(_project_id uuid, _cutoff timestamp with time zone, _versions text[] DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proj public.projects%ROWTYPE;
  cutoff timestamptz;
  rate numeric;
  result jsonb;
  vers text[];
BEGIN
  SELECT * INTO proj FROM public.projects WHERE id = _project_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  cutoff := COALESCE(_cutoff, now());
  rate := COALESCE(proj.rate_per_hour, 0);
  vers := COALESCE(_versions, proj.client_portal_versions);
  IF vers IS NOT NULL AND cardinality(vers) = 0 THEN vers := NULL; END IF;

  WITH ticket_hours AS (
    SELECT tl.ticket_id,
      SUM(CASE WHEN tl.discipline = 'FE' THEN tl.hours ELSE 0 END) AS fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' THEN tl.hours ELSE 0 END) AS be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' THEN tl.hours ELSE 0 END) AS proj_hours
    FROM public.time_logs tl
    WHERE tl.logged_at <= cutoff
    GROUP BY tl.ticket_id
  ),
  ticket_rows AS (
    SELECT
      t.id, t.formatted_id, t.title, t.epic_id,
      t.fe_status, t.be_status, t.ticket_type, t.cr_approval,
      COALESCE(t.current_fe_estimate, 0) AS current_fe_estimate,
      COALESCE(t.current_be_estimate, 0) AS current_be_estimate,
      COALESCE(t.current_project_estimate, 0) AS current_project_estimate,
      COALESCE(t.original_fe_estimate, 0) AS original_fe_estimate,
      COALESCE(t.original_be_estimate, 0) AS original_be_estimate,
      COALESCE(t.original_project_estimate, 0) AS original_project_estimate,
      COALESCE(th.fe_hours, 0) AS actual_fe,
      COALESCE(th.be_hours, 0) AS actual_be,
      COALESCE(th.proj_hours, 0) AS actual_proj,
      s.category AS status_category,
      CASE
        WHEN t.ticket_type = 'CR'
             AND t.cr_approval = 'approved'
             AND COALESCE(t.cr_decided_at, t.created_at) <= cutoff
          THEN true
        ELSE false
      END AS cr_effective,
      (t.ticket_type IS DISTINCT FROM 'CR') AS is_baseline
    FROM public.tickets t
    LEFT JOIN ticket_hours th ON th.ticket_id = t.id
    LEFT JOIN public.statuses s ON s.id = t.status_id
    WHERE t.project_id = proj.id
      AND t.created_at <= cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
  ),
  ticket_contrib AS (
    SELECT
      tr.*,
      CASE WHEN is_baseline THEN current_fe_estimate
           WHEN cr_effective THEN current_fe_estimate
           ELSE 0 END AS c_fe,
      CASE WHEN is_baseline THEN current_be_estimate
           WHEN cr_effective THEN current_be_estimate
           ELSE 0 END AS c_be,
      CASE WHEN is_baseline THEN current_project_estimate
           WHEN cr_effective THEN current_project_estimate
           ELSE 0 END AS c_pr,
      CASE WHEN is_baseline THEN original_fe_estimate ELSE 0 END AS o_fe,
      CASE WHEN is_baseline THEN original_be_estimate ELSE 0 END AS o_be,
      CASE WHEN is_baseline THEN original_project_estimate ELSE 0 END AS o_pr
    FROM ticket_rows tr
  ),
  epic_rows AS (
    SELECT
      e.id, e.epic_name,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline)::int AS total_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'backlog')::int AS backlog_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'active')::int AS in_progress_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'dev done')::int AS dev_done_tickets,
      COUNT(tc.id) FILTER (WHERE tc.is_baseline AND tc.status_category = 'done')::int AS done_tickets,
      COALESCE(SUM(tc.c_fe + tc.c_be + tc.c_pr), 0) AS current_estimate,
      COALESCE(SUM(tc.o_fe + tc.o_be + tc.o_pr), 0) AS original_estimate,
      COALESCE(SUM(tc.actual_fe + tc.actual_be + tc.actual_proj), 0) AS actual_hours
    FROM public.project_epics e
    LEFT JOIN ticket_contrib tc ON tc.epic_id = e.id
    WHERE e.project_id = proj.id
    GROUP BY e.id, e.epic_name
    HAVING vers IS NULL OR COUNT(tc.id) > 0
    ORDER BY e.epic_name NULLS LAST
  ),
  epic_with_summary AS (
    SELECT er.*, pes.pmba_text, pes.ai_draft, pes.included
    FROM epic_rows er
    LEFT JOIN public.project_epic_summaries pes
      ON pes.project_id = proj.id AND pes.epic_id = er.id
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id, 'name', proj.name, 'acronym', proj.acronym,
      'client_name', proj.client_name, 'cutoff', cutoff,
      'rate_per_hour', rate,
      'summary', COALESCE(proj.client_summary_draft, proj.client_summary_published),
      'summary_updated_at', proj.client_summary_updated_at
    ),
    'totals', (
      SELECT jsonb_build_object(
        'tickets_total', COUNT(*) FILTER (WHERE is_baseline),
        'tickets_backlog', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'backlog'),
        'tickets_in_progress', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'active'),
        'tickets_dev_done', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'dev done'),
        'tickets_done', COUNT(*) FILTER (WHERE is_baseline AND status_category = 'done'),
        'fe_actual', COALESCE(SUM(actual_fe), 0),
        'be_actual', COALESCE(SUM(actual_be), 0),
        'proj_actual', COALESCE(SUM(actual_proj), 0),
        'fe_estimate', COALESCE(SUM(c_fe), 0),
        'be_estimate', COALESCE(SUM(c_be), 0),
        'proj_estimate', COALESCE(SUM(c_pr), 0),
        'fe_done', COUNT(*) FILTER (WHERE is_baseline AND fe_status = 'done'),
        'fe_in_progress', COUNT(*) FILTER (WHERE is_baseline AND fe_status IN ('in_progress','for_integration')),
        'fe_todo', COUNT(*) FILTER (WHERE is_baseline AND fe_status = 'todo'),
        'be_done', COUNT(*) FILTER (WHERE is_baseline AND be_status = 'done'),
        'be_in_progress', COUNT(*) FILTER (WHERE is_baseline AND be_status IN ('in_progress','for_integration')),
        'be_todo', COUNT(*) FILTER (WHERE is_baseline AND be_status = 'todo'),
        'original_total', COALESCE(SUM(o_fe + o_be + o_pr), 0),
        'current_total', COALESCE(SUM(c_fe + c_be + c_pr), 0),
        'actual_total', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0),
        'cost_actual', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0) * rate,
        'cost_estimate', COALESCE(SUM(c_fe + c_be + c_pr), 0) * rate
      ) FROM ticket_contrib
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_with_summary)) FROM epic_with_summary), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

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
  vers text[];
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
  vers := proj.client_portal_versions;
  IF vers IS NOT NULL AND cardinality(vers) = 0 THEN vers := NULL; END IF;

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
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
    ), '[]'::jsonb),
    'sprint_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ticket_id', st.ticket_id,
        'sprint_id', st.sprint_id,
        'discipline', st.discipline
      ))
      FROM public.sprint_tickets st
      JOIN public.sprints s ON s.id = st.sprint_id
      JOIN public.tickets t ON t.id = st.ticket_id
      WHERE s.project_id = proj.id
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_portal_change_requests(_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _project_id uuid;
  _result jsonb;
  hashed text;
  vers text[];
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  hashed := encode(digest(_hash, 'sha256'), 'hex');

  SELECT id, client_portal_versions INTO _project_id, vers FROM public.projects
   WHERE client_portal_hash_sha = hashed
      OR client_portal_hash = _hash
   LIMIT 1;
  IF _project_id IS NULL THEN RETURN NULL; END IF;
  IF vers IS NOT NULL AND cardinality(vers) = 0 THEN vers := NULL; END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object('id', p.id, 'acronym', p.acronym, 'name', p.name)
      FROM public.projects p WHERE p.id = _project_id
    ),
    'epics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name) ORDER BY e.epic_name)
      FROM public.project_epics e WHERE e.project_id = _project_id
    ), '[]'::jsonb),
    'baseline_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'epic_id', t.epic_id,
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
      FROM public.tickets t
      WHERE t.project_id = _project_id AND t.ticket_type <> 'CR'
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
    ), '[]'::jsonb),
    'cr_tickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'formatted_id', t.formatted_id, 'title', t.title,
        'ticket_type', t.ticket_type, 'epic_id', t.epic_id,
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
      FROM public.tickets t
      WHERE t.project_id = _project_id AND t.ticket_type = 'CR'
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers))
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$function$;