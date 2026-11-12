DROP FUNCTION IF EXISTS public.get_client_portal(_hash text);
DROP FUNCTION IF EXISTS public.get_project_portal_preview(_project_id uuid, _cutoff timestamp with time zone, _versions text[]);
DROP FUNCTION IF EXISTS public.get_client_portal_billing(_hash text);
DROP FUNCTION IF EXISTS public.get_client_portal_change_requests(_hash text);
DROP FUNCTION IF EXISTS public.get_client_portal_gantt(_hash text);
DROP FUNCTION IF EXISTS public.get_project_portal_billing(_project_id uuid, _cutoff timestamp with time zone, _versions text[]);
DROP FUNCTION IF EXISTS public.portal_billing_payload(_project_id uuid, _cutoff timestamp with time zone, _versions text[]);
CREATE OR REPLACE FUNCTION public.portal_filter_match(_type text, _epic bigint, _version text, _types text[], _epics bigint[], _versions text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (COALESCE(cardinality(_types),0)=0 OR _type = ANY(_types))
     AND (COALESCE(cardinality(_epics),0)=0 OR COALESCE(_epic,0) = ANY(_epics))
     AND (COALESCE(cardinality(_versions),0)=0 OR COALESCE(NULLIF(btrim(_version),''),'_none') = ANY(_versions))
$$;
CREATE OR REPLACE FUNCTION public.portal_discount_match(_epic bigint, _types text[], _epics bigint[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT COALESCE(cardinality(_types),0)=0 AND (COALESCE(cardinality(_epics),0)=0 OR COALESCE(_epic,0) = ANY(_epics))
$$;

CREATE OR REPLACE FUNCTION public.get_client_portal(_hash text, _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
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
  vers text[];
  hashed text;
  m_start timestamptz;
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
  m_start := date_trunc('month', cutoff AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London';

  WITH ticket_hours AS (
    SELECT tl.ticket_id,
      SUM(CASE WHEN tl.discipline = 'FE' THEN tl.hours ELSE 0 END) AS fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' THEN tl.hours ELSE 0 END) AS be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' THEN tl.hours ELSE 0 END) AS proj_hours,
      SUM(CASE WHEN tl.discipline = 'FE' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_proj_hours
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
      COALESCE(th.m_fe_hours, 0) AS month_fe,
      COALESCE(th.m_be_hours, 0) AS month_be,
      COALESCE(th.m_proj_hours, 0) AS month_proj,
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
    WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = proj.id
      AND t.created_at <= cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
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
    HAVING (vers IS NULL AND COALESCE(cardinality(_f_types),0)+COALESCE(cardinality(_f_epics),0)+COALESCE(cardinality(_f_versions),0)=0) OR COUNT(tc.id) > 0
    ORDER BY e.order_index, e.id
  ),
  epic_with_summary AS (
    SELECT er.*, pes.pmba_text, pes.ai_draft, pes.included
    FROM epic_rows er
    LEFT JOIN public.project_epic_summaries pes
      ON pes.project_id = proj.id AND pes.epic_id = er.id
  ),
  month_discount AS (
    SELECT COALESCE(SUM(ed.hours), 0) AS hours
    FROM public.epic_discounts ed
    WHERE ed.project_id = proj.id AND public.portal_discount_match(ed.epic_id, _f_types, _f_epics)
      AND ed.applied_at >= m_start
      AND ed.applied_at <= cutoff
  ),
  portal_discounts AS (
    SELECT ed.id, ed.epic_id, ed.discipline, ed.hours, ed.reason, ed.applied_at
    FROM public.epic_discounts ed
    WHERE ed.project_id = proj.id AND public.portal_discount_match(ed.epic_id, _f_types, _f_epics)
      AND ed.applied_at <= cutoff
    ORDER BY ed.applied_at
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id, 'name', proj.name, 'acronym', proj.acronym,
      'client_name', proj.client_name, 'cutoff', cutoff,
      'rate_per_hour', rate,
      'summary', proj.client_summary_published,
      'summary_updated_at', proj.client_summary_updated_at,
      'versions', to_jsonb(vers)
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
    'month', (
      SELECT jsonb_build_object(
        'start', m_start,
        'end', cutoff,
        'fe_actual', COALESCE(SUM(tc.month_fe), 0),
        'be_actual', COALESCE(SUM(tc.month_be), 0),
        'proj_actual', COALESCE(SUM(tc.month_proj), 0),
        'discount_hours', (SELECT hours FROM month_discount),
        'billed_hours', GREATEST(0, COALESCE(SUM(tc.month_fe + tc.month_be + tc.month_proj), 0) - (SELECT hours FROM month_discount)),
        'cost', GREATEST(0, COALESCE(SUM(tc.month_fe + tc.month_be + tc.month_proj), 0) - (SELECT hours FROM month_discount)) * rate
      ) FROM ticket_contrib tc
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_with_summary)) FROM epic_with_summary), '[]'::jsonb),
    'discounts', COALESCE((SELECT jsonb_agg(to_jsonb(portal_discounts)) FROM portal_discounts), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_project_portal_preview(_project_id uuid, _cutoff timestamp with time zone, _versions text[] DEFAULT NULL::text[], _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
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
  m_start timestamptz;
BEGIN
  SELECT * INTO proj FROM public.projects WHERE id = _project_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  cutoff := COALESCE(_cutoff, now());
  rate := COALESCE(proj.rate_per_hour, 0);
  vers := COALESCE(_versions, proj.client_portal_versions);
  IF vers IS NOT NULL AND cardinality(vers) = 0 THEN vers := NULL; END IF;
  m_start := date_trunc('month', cutoff AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London';

  WITH ticket_hours AS (
    SELECT tl.ticket_id,
      SUM(CASE WHEN tl.discipline = 'FE' THEN tl.hours ELSE 0 END) AS fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' THEN tl.hours ELSE 0 END) AS be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' THEN tl.hours ELSE 0 END) AS proj_hours,
      SUM(CASE WHEN tl.discipline = 'FE' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' AND tl.logged_at >= m_start THEN tl.hours ELSE 0 END) AS m_proj_hours
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
      COALESCE(th.m_fe_hours, 0) AS month_fe,
      COALESCE(th.m_be_hours, 0) AS month_be,
      COALESCE(th.m_proj_hours, 0) AS month_proj,
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
    WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = proj.id
      AND t.created_at <= cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
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
    HAVING (vers IS NULL AND COALESCE(cardinality(_f_types),0)+COALESCE(cardinality(_f_epics),0)+COALESCE(cardinality(_f_versions),0)=0) OR COUNT(tc.id) > 0
    ORDER BY e.order_index, e.id
  ),
  epic_with_summary AS (
    SELECT er.*, pes.pmba_text, pes.ai_draft, pes.included
    FROM epic_rows er
    LEFT JOIN public.project_epic_summaries pes
      ON pes.project_id = proj.id AND pes.epic_id = er.id
  ),
  month_discount AS (
    SELECT COALESCE(SUM(ed.hours), 0) AS hours
    FROM public.epic_discounts ed
    WHERE ed.project_id = proj.id AND public.portal_discount_match(ed.epic_id, _f_types, _f_epics)
      AND ed.applied_at >= m_start
      AND ed.applied_at <= cutoff
  ),
  portal_discounts AS (
    SELECT ed.id, ed.epic_id, ed.discipline, ed.hours, ed.reason, ed.applied_at
    FROM public.epic_discounts ed
    WHERE ed.project_id = proj.id AND public.portal_discount_match(ed.epic_id, _f_types, _f_epics)
      AND ed.applied_at <= cutoff
    ORDER BY ed.applied_at
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id, 'name', proj.name, 'acronym', proj.acronym,
      'client_name', proj.client_name, 'cutoff', cutoff,
      'rate_per_hour', rate,
      'summary', COALESCE(proj.client_summary_draft, proj.client_summary_published),
      'summary_updated_at', proj.client_summary_updated_at,
      'versions', to_jsonb(vers)
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
    'month', (
      SELECT jsonb_build_object(
        'start', m_start,
        'end', cutoff,
        'fe_actual', COALESCE(SUM(tc.month_fe), 0),
        'be_actual', COALESCE(SUM(tc.month_be), 0),
        'proj_actual', COALESCE(SUM(tc.month_proj), 0),
        'discount_hours', (SELECT hours FROM month_discount),
        'billed_hours', GREATEST(0, COALESCE(SUM(tc.month_fe + tc.month_be + tc.month_proj), 0) - (SELECT hours FROM month_discount)),
        'cost', GREATEST(0, COALESCE(SUM(tc.month_fe + tc.month_be + tc.month_proj), 0) - (SELECT hours FROM month_discount)) * rate
      ) FROM ticket_contrib tc
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_with_summary)) FROM epic_with_summary), '[]'::jsonb),
    'discounts', COALESCE((SELECT jsonb_agg(to_jsonb(portal_discounts)) FROM portal_discounts), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_portal_billing(_hash text, _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE proj public.projects%ROWTYPE;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO proj FROM public.projects
   WHERE client_portal_hash_sha = encode(digest(_hash,'sha256'),'hex') OR client_portal_hash = _hash LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL OR proj.is_archived THEN RETURN NULL; END IF;
  RETURN public.portal_billing_payload(proj.id, proj.client_visibility_cutoff, proj.client_portal_versions, _f_types, _f_epics, _f_versions);
END $function$;

CREATE OR REPLACE FUNCTION public.get_client_portal_change_requests(_hash text, _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
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
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name) ORDER BY e.order_index, e.id)
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
      WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = _project_id AND t.ticket_type <> 'CR'
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
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
      WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = _project_id AND t.ticket_type = 'CR'
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_portal_gantt(_hash text, _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
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
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name) ORDER BY e.order_index, e.id)
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
      WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = proj.id
        AND t.ticket_type <> 'Proj'
        AND t.created_at <= proj.client_visibility_cutoff
        AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
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
        AND (vers IS NULL OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(vers)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_project_portal_billing(_project_id uuid, _cutoff timestamp with time zone, _versions text[] DEFAULT NULL::text[], _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.current_is_pmba() OR public.current_is_project_member(_project_id)) THEN RETURN NULL; END IF;
  RETURN public.portal_billing_payload(_project_id, COALESCE(_cutoff, now()),
    COALESCE(_versions, (SELECT client_portal_versions FROM public.projects WHERE id = _project_id)), _f_types, _f_epics, _f_versions);
END $function$;

CREATE OR REPLACE FUNCTION public.portal_billing_payload(_project_id uuid, _cutoff timestamp with time zone, _versions text[], _f_types text[] DEFAULT NULL::text[], _f_epics bigint[] DEFAULT NULL::bigint[], _f_versions text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH proj AS (SELECT * FROM public.projects WHERE id = _project_id),
  vers AS (SELECT CASE WHEN _versions IS NULL OR cardinality(_versions) = 0 THEN NULL ELSE _versions END AS v),
  tk AS (
    SELECT t.id, t.epic_id, t.ticket_type,
      COALESCE(t.original_fe_estimate,0)+COALESCE(t.original_be_estimate,0)+COALESCE(t.original_project_estimate,0) AS orig,
      COALESCE(t.current_fe_estimate,0)+COALESCE(t.current_be_estimate,0)+COALESCE(t.current_project_estimate,0) AS cur
    FROM public.tickets t, vers
    WHERE t.ticket_type::text <> 'Feedback' AND t.project_id = _project_id AND t.created_at <= _cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers.v IS NULL OR COALESCE(NULLIF(btrim(t.version),''),'_none') = ANY(vers.v)) AND public.portal_filter_match(t.ticket_type::text, t.epic_id, t.version, _f_types, _f_epics, _f_versions)
  ),
  logs AS (
    SELECT tk.epic_id, to_char(tl.logged_at AT TIME ZONE 'Europe/London','YYYY-MM') AS month, SUM(tl.hours) AS hours
    FROM public.time_logs tl JOIN tk ON tk.id = tl.ticket_id
    WHERE tl.logged_at <= _cutoff GROUP BY 1,2
  ),
  disc AS (
    SELECT ed.epic_id, to_char(ed.applied_at AT TIME ZONE 'Europe/London','YYYY-MM') AS month, SUM(ed.hours) AS hours
    FROM public.epic_discounts ed
    WHERE ed.project_id = _project_id AND ed.applied_at <= _cutoff AND public.portal_discount_match(ed.epic_id, _f_types, _f_epics) GROUP BY 1,2
  ),
  s AS (
    SELECT epic_id,
      SUM(orig) FILTER (WHERE ticket_type IN ('Standard','Proj')) AS std,
      SUM(orig) FILTER (WHERE ticket_type = 'CR') AS cr,
      SUM(orig) FILTER (WHERE ticket_type = 'Bug') AS bug,
      SUM(cur) AS cur
    FROM tk GROUP BY epic_id
  ),
  rows AS (
    SELECT e.id, e.epic_name, s.std, s.cr, s.bug, s.cur, 0 AS grp, e.order_index AS oi
    FROM public.project_epics e JOIN s ON s.epic_id = e.id WHERE e.project_id = _project_id
    UNION ALL
    SELECT NULL, 'No Epic', s.std, s.cr, s.bug, s.cur, 1, 0 FROM s WHERE s.epic_id IS NULL
  )
  SELECT jsonb_build_object(
    'project', (SELECT jsonb_build_object('id', id, 'name', name, 'rate_per_hour', COALESCE(rate_per_hour,0),
                'start_date', start_date, 'cutoff', _cutoff) FROM proj),
    'epics', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'epic_name', epic_name,
        'original_std', std, 'original_cr', cr, 'original_bug', bug, 'revised', cur) ORDER BY grp, oi, id) FROM rows), '[]'::jsonb),
    'logs', COALESCE((SELECT jsonb_agg(jsonb_build_object('epic_id', epic_id, 'month', month, 'hours', hours)) FROM logs), '[]'::jsonb),
    'discounts', COALESCE((SELECT jsonb_agg(jsonb_build_object('epic_id', epic_id, 'month', month, 'hours', hours)) FROM disc), '[]'::jsonb)
  )
$function$;

REVOKE ALL ON FUNCTION public.portal_billing_payload(uuid, timestamptz, text[], text[], bigint[], text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal(text, text[], bigint[], text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_billing(text, text[], bigint[], text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_change_requests(text, text[], bigint[], text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_gantt(text, text[], bigint[], text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_portal_preview(uuid, timestamptz, text[], text[], bigint[], text[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_portal_billing(uuid, timestamptz, text[], text[], bigint[], text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_project_portal_billing(uuid, timestamptz, text[], text[], bigint[], text[]) TO authenticated;