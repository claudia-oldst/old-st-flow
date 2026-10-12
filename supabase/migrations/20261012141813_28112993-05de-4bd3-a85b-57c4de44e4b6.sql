CREATE OR REPLACE FUNCTION public.portal_billing_payload(_project_id uuid, _cutoff timestamptz, _versions text[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH proj AS (SELECT * FROM public.projects WHERE id = _project_id),
  vers AS (SELECT CASE WHEN _versions IS NULL OR cardinality(_versions) = 0 THEN NULL ELSE _versions END AS v),
  tk AS (
    SELECT t.id, t.epic_id, t.ticket_type,
      COALESCE(t.original_fe_estimate,0)+COALESCE(t.original_be_estimate,0)+COALESCE(t.original_project_estimate,0) AS orig,
      COALESCE(t.current_fe_estimate,0)+COALESCE(t.current_be_estimate,0)+COALESCE(t.current_project_estimate,0) AS cur
    FROM public.tickets t, vers
    WHERE t.project_id = _project_id AND t.created_at <= _cutoff
      AND (t.ticket_type IS DISTINCT FROM 'CR' OR t.cr_approval = 'approved')
      AND (vers.v IS NULL OR COALESCE(NULLIF(btrim(t.version),''),'_none') = ANY(vers.v))
  ),
  logs AS (
    SELECT tk.epic_id, to_char(tl.logged_at AT TIME ZONE 'Europe/London','YYYY-MM') AS month, SUM(tl.hours) AS hours
    FROM public.time_logs tl JOIN tk ON tk.id = tl.ticket_id
    WHERE tl.logged_at <= _cutoff GROUP BY 1,2
  )
  SELECT jsonb_build_object(
    'project', (SELECT jsonb_build_object('id', id, 'name', name, 'rate_per_hour', COALESCE(rate_per_hour,0),
                'start_date', start_date, 'cutoff', _cutoff) FROM proj),
    'epics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', e.id, 'epic_name', e.epic_name,
        'original_std', s.std, 'original_cr', s.cr, 'original_bug', s.bug, 'revised', s.cur) ORDER BY e.epic_name)
      FROM public.project_epics e
      JOIN (SELECT epic_id,
              SUM(orig) FILTER (WHERE ticket_type IN ('Standard','Proj')) AS std,
              SUM(orig) FILTER (WHERE ticket_type = 'CR') AS cr,
              SUM(orig) FILTER (WHERE ticket_type = 'Bug') AS bug,
              SUM(cur) AS cur
            FROM tk GROUP BY epic_id) s ON s.epic_id = e.id
      WHERE e.project_id = _project_id), '[]'::jsonb),
    'logs', COALESCE((SELECT jsonb_agg(jsonb_build_object('epic_id', epic_id, 'month', month, 'hours', hours)) FROM logs), '[]'::jsonb)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.portal_billing_payload(uuid, timestamptz, text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_client_portal_billing(_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE proj public.projects%ROWTYPE;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO proj FROM public.projects
   WHERE client_portal_hash_sha = encode(digest(_hash,'sha256'),'hex') OR client_portal_hash = _hash LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL OR proj.is_archived THEN RETURN NULL; END IF;
  RETURN public.portal_billing_payload(proj.id, proj.client_visibility_cutoff, proj.client_portal_versions);
END $$;
GRANT EXECUTE ON FUNCTION public.get_client_portal_billing(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_project_portal_billing(_project_id uuid, _cutoff timestamptz, _versions text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.current_is_pmba() OR public.current_is_project_member(_project_id)) THEN RETURN NULL; END IF;
  RETURN public.portal_billing_payload(_project_id, COALESCE(_cutoff, now()),
    COALESCE(_versions, (SELECT client_portal_versions FROM public.projects WHERE id = _project_id)));
END $$;
REVOKE EXECUTE ON FUNCTION public.get_project_portal_billing(uuid, timestamptz, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_portal_billing(uuid, timestamptz, text[]) TO authenticated;