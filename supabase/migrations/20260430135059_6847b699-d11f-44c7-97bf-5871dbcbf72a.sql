-- 1. Add columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_visibility_cutoff timestamptz,
  ADD COLUMN IF NOT EXISTS client_portal_hash text UNIQUE,
  ADD COLUMN IF NOT EXISTS client_summary_published text,
  ADD COLUMN IF NOT EXISTS client_summary_draft text,
  ADD COLUMN IF NOT EXISTS client_summary_updated_at timestamptz;

-- 2. Public RPC: returns a single JSON blob for the portal, filtered by cutoff.
CREATE OR REPLACE FUNCTION public.get_client_portal(_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj public.projects%ROWTYPE;
  cutoff timestamptz;
  result jsonb;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO proj FROM public.projects WHERE client_portal_hash = _hash LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL THEN
    RETURN NULL;
  END IF;
  cutoff := proj.client_visibility_cutoff;

  WITH ticket_hours AS (
    SELECT
      tl.ticket_id,
      SUM(CASE WHEN tl.discipline = 'FE' THEN tl.hours ELSE 0 END) AS fe_hours,
      SUM(CASE WHEN tl.discipline = 'BE' THEN tl.hours ELSE 0 END) AS be_hours,
      SUM(CASE WHEN tl.discipline = 'Project' THEN tl.hours ELSE 0 END) AS proj_hours
    FROM public.time_logs tl
    WHERE tl.logged_at <= cutoff
    GROUP BY tl.ticket_id
  ),
  ticket_rows AS (
    SELECT
      t.id,
      t.formatted_id,
      t.title,
      t.epic_id,
      t.status_id,
      t.current_fe_estimate,
      t.current_be_estimate,
      t.current_project_estimate,
      t.original_fe_estimate,
      t.original_be_estimate,
      t.original_project_estimate,
      COALESCE(th.fe_hours, 0) AS actual_fe,
      COALESCE(th.be_hours, 0) AS actual_be,
      COALESCE(th.proj_hours, 0) AS actual_proj,
      s.category AS status_category
    FROM public.tickets t
    LEFT JOIN ticket_hours th ON th.ticket_id = t.id
    LEFT JOIN public.statuses s ON s.id = t.status_id
    WHERE t.project_id = proj.id
  ),
  change_rows AS (
    SELECT
      tec.id,
      tec.ticket_id,
      tec.discipline,
      tec.previous_hours,
      tec.new_hours,
      tec.delta,
      tec.reason,
      COALESCE(tec.decided_at, tec.created_at) AS occurred_at,
      t.formatted_id AS ticket_formatted_id
    FROM public.ticket_estimate_changes tec
    JOIN public.tickets t ON t.id = tec.ticket_id
    WHERE t.project_id = proj.id
      AND tec.status = 'approved'
      AND COALESCE(tec.decided_at, tec.created_at) <= cutoff
    ORDER BY COALESCE(tec.decided_at, tec.created_at) DESC
  ),
  epic_rows AS (
    SELECT
      e.id,
      e.epic_name,
      COUNT(tr.id)::int AS total_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'done')::int AS done_tickets,
      COALESCE(SUM(tr.current_fe_estimate + tr.current_be_estimate + tr.current_project_estimate), 0) AS current_estimate,
      COALESCE(SUM(tr.original_fe_estimate + tr.original_be_estimate + tr.original_project_estimate), 0) AS original_estimate
    FROM public.project_epics e
    LEFT JOIN ticket_rows tr ON tr.epic_id = e.id
    WHERE e.project_id = proj.id
    GROUP BY e.id, e.epic_name
    ORDER BY e.epic_name NULLS LAST
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id,
      'name', proj.name,
      'acronym', proj.acronym,
      'client_name', proj.client_name,
      'cutoff', proj.client_visibility_cutoff,
      'summary', proj.client_summary_published,
      'summary_updated_at', proj.client_summary_updated_at
    ),
    'totals', (
      SELECT jsonb_build_object(
        'tickets_total', COUNT(*),
        'tickets_done', COUNT(*) FILTER (WHERE status_category = 'done'),
        'fe_actual', COALESCE(SUM(actual_fe), 0),
        'be_actual', COALESCE(SUM(actual_be), 0),
        'proj_actual', COALESCE(SUM(actual_proj), 0),
        'fe_estimate', COALESCE(SUM(current_fe_estimate), 0),
        'be_estimate', COALESCE(SUM(current_be_estimate), 0),
        'proj_estimate', COALESCE(SUM(current_project_estimate), 0),
        'original_total', COALESCE(SUM(original_fe_estimate + original_be_estimate + original_project_estimate), 0),
        'current_total', COALESCE(SUM(current_fe_estimate + current_be_estimate + current_project_estimate), 0),
        'actual_total', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0)
      ) FROM ticket_rows
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_rows)) FROM epic_rows), '[]'::jsonb),
    'changes', COALESCE((SELECT jsonb_agg(to_jsonb(change_rows)) FROM change_rows), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO anon, authenticated;