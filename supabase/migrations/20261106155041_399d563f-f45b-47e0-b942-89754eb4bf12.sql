CREATE OR REPLACE FUNCTION public.portal_billing_payload(_project_id uuid, _cutoff timestamp with time zone, _versions text[])
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
      AND (vers.v IS NULL OR COALESCE(NULLIF(btrim(t.version),''),'_none') = ANY(vers.v))
  ),
  logs AS (
    SELECT tk.epic_id, to_char(tl.logged_at AT TIME ZONE 'Europe/London','YYYY-MM') AS month, SUM(tl.hours) AS hours
    FROM public.time_logs tl JOIN tk ON tk.id = tl.ticket_id
    WHERE tl.logged_at <= _cutoff GROUP BY 1,2
  ),
  disc AS (
    SELECT ed.epic_id, to_char(ed.applied_at AT TIME ZONE 'Europe/London','YYYY-MM') AS month, SUM(ed.hours) AS hours
    FROM public.epic_discounts ed
    WHERE ed.project_id = _project_id AND ed.applied_at <= _cutoff GROUP BY 1,2
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
REVOKE EXECUTE ON FUNCTION public.portal_billing_payload(uuid, timestamptz, text[]) FROM PUBLIC, anon, authenticated;