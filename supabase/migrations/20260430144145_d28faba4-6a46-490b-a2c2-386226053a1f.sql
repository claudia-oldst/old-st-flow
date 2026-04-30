-- 1. Per-epic client-facing summaries
CREATE TABLE IF NOT EXISTS public.project_epic_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  epic_id bigint NOT NULL,
  ai_draft text,
  pmba_text text,
  included boolean NOT NULL DEFAULT true,
  delta_hours numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, epic_id)
);

ALTER TABLE public.project_epic_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epic summaries readable by all"
  ON public.project_epic_summaries FOR SELECT USING (true);
CREATE POLICY "epic summaries insertable by all"
  ON public.project_epic_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "epic summaries updatable by all"
  ON public.project_epic_summaries FOR UPDATE USING (true);
CREATE POLICY "epic summaries deletable by all"
  ON public.project_epic_summaries FOR DELETE USING (true);

DROP TRIGGER IF EXISTS trg_epic_summaries_updated_at ON public.project_epic_summaries;
CREATE TRIGGER trg_epic_summaries_updated_at
  BEFORE UPDATE ON public.project_epic_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Replace get_client_portal with v2 payload (status counts, FE/BE, GBP, summaries)
CREATE OR REPLACE FUNCTION public.get_client_portal(_hash text)
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
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO proj FROM public.projects WHERE client_portal_hash = _hash LIMIT 1;
  IF NOT FOUND OR proj.client_visibility_cutoff IS NULL THEN
    RETURN NULL;
  END IF;
  cutoff := proj.client_visibility_cutoff;
  rate := COALESCE(proj.rate_per_hour, 0);

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
      t.fe_status,
      t.be_status,
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
      AND t.created_at <= cutoff
  ),
  epic_rows AS (
    SELECT
      e.id,
      e.epic_name,
      COUNT(tr.id)::int                                                  AS total_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'backlog')::int    AS backlog_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'in_progress')::int AS in_progress_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'done')::int        AS done_tickets,
      COALESCE(SUM(tr.current_fe_estimate + tr.current_be_estimate + tr.current_project_estimate), 0)   AS current_estimate,
      COALESCE(SUM(tr.original_fe_estimate + tr.original_be_estimate + tr.original_project_estimate), 0) AS original_estimate,
      COALESCE(SUM(tr.actual_fe + tr.actual_be + tr.actual_proj), 0)      AS actual_hours
    FROM public.project_epics e
    LEFT JOIN ticket_rows tr ON tr.epic_id = e.id
    WHERE e.project_id = proj.id
    GROUP BY e.id, e.epic_name
    ORDER BY e.epic_name NULLS LAST
  ),
  epic_with_summary AS (
    SELECT
      er.*,
      pes.pmba_text,
      pes.ai_draft,
      pes.included
    FROM epic_rows er
    LEFT JOIN public.project_epic_summaries pes
      ON pes.project_id = proj.id AND pes.epic_id = er.id
  )
  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', proj.id,
      'name', proj.name,
      'acronym', proj.acronym,
      'client_name', proj.client_name,
      'cutoff', proj.client_visibility_cutoff,
      'rate_per_hour', rate,
      'summary', proj.client_summary_published,
      'summary_updated_at', proj.client_summary_updated_at
    ),
    'totals', (
      SELECT jsonb_build_object(
        'tickets_total', COUNT(*),
        'tickets_backlog', COUNT(*) FILTER (WHERE status_category = 'backlog'),
        'tickets_in_progress', COUNT(*) FILTER (WHERE status_category = 'in_progress'),
        'tickets_done', COUNT(*) FILTER (WHERE status_category = 'done'),
        'fe_actual', COALESCE(SUM(actual_fe), 0),
        'be_actual', COALESCE(SUM(actual_be), 0),
        'proj_actual', COALESCE(SUM(actual_proj), 0),
        'fe_estimate', COALESCE(SUM(current_fe_estimate), 0),
        'be_estimate', COALESCE(SUM(current_be_estimate), 0),
        'proj_estimate', COALESCE(SUM(current_project_estimate), 0),
        'fe_done', COUNT(*) FILTER (WHERE fe_status = 'done'),
        'fe_in_progress', COUNT(*) FILTER (WHERE fe_status = 'in_progress'),
        'fe_todo', COUNT(*) FILTER (WHERE fe_status = 'todo'),
        'be_done', COUNT(*) FILTER (WHERE be_status = 'done'),
        'be_in_progress', COUNT(*) FILTER (WHERE be_status = 'in_progress'),
        'be_todo', COUNT(*) FILTER (WHERE be_status = 'todo'),
        'original_total', COALESCE(SUM(original_fe_estimate + original_be_estimate + original_project_estimate), 0),
        'current_total', COALESCE(SUM(current_fe_estimate + current_be_estimate + current_project_estimate), 0),
        'actual_total', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0),
        'cost_actual', COALESCE(SUM(actual_fe + actual_be + actual_proj), 0) * rate,
        'cost_estimate', COALESCE(SUM(current_fe_estimate + current_be_estimate + current_project_estimate), 0) * rate
      ) FROM ticket_rows
    ),
    'epics', COALESCE((SELECT jsonb_agg(to_jsonb(epic_with_summary)) FROM epic_with_summary), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO anon, authenticated;