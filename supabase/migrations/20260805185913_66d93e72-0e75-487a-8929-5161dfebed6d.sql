DO $$
DECLARE
  _pid uuid := '191ba49a-f4f4-4cca-abe7-2b982342f07f';
  _recent date := '2026-07-05';
BEGIN

INSERT INTO public.project_members (project_id, user_id, role)
SELECT _pid, tm.id,
  CASE
    WHEN d.has_fe AND d.has_be THEN 'Fullstack'::public.project_role
    WHEN d.has_fe THEN 'Frontend'::public.project_role
    WHEN d.has_be THEN 'Backend'::public.project_role
    ELSE tm.role
  END
FROM (
  SELECT assignee,
         bool_or(discipline = 'FE') AS has_fe,
         bool_or(discipline = 'BE') AS has_be
  FROM public.import_cou_logs GROUP BY assignee
) d
JOIN public.team_members tm ON tm.id = d.assignee
ON CONFLICT DO NOTHING;

INSERT INTO public.project_epics (project_id, epic_name)
SELECT DISTINCT _pid, epic FROM public.import_cou_logs WHERE epic IS NOT NULL;

CREATE TABLE public.import_cou_map (
  ticket_name text,
  epic text,
  ticket_id uuid
);

WITH agg AS (
  SELECT
    l.ticket_name,
    l.epic,
    CASE WHEN bool_or(l.ticket_type = 'Project') THEN 'Proj'
         WHEN bool_or(l.ticket_type = 'Bug') THEN 'Bug'
         ELSE 'Standard' END::public.ticket_type AS t_type,
    min(l.created_date) AS created_date,
    max(l.fe_est) AS fe_est,
    max(l.be_est) AS be_est,
    max(l.pj_est) AS pj_est,
    sum(l.hours) FILTER (WHERE l.discipline = 'FE')   AS fe_actual,
    sum(l.hours) FILTER (WHERE l.discipline = 'BE')   AS be_actual,
    sum(l.hours) FILTER (WHERE l.discipline = 'Proj') AS pj_actual,
    max(l.log_date) FILTER (WHERE l.discipline = 'FE') AS fe_last,
    max(l.log_date) FILTER (WHERE l.discipline = 'BE') AS be_last,
    row_number() OVER (ORDER BY min(l.created_date), l.epic NULLS LAST, l.ticket_name) AS rn
  FROM public.import_cou_logs l
  GROUP BY l.ticket_name, l.epic
),
ins AS (
  INSERT INTO public.tickets (
    project_id, ticket_number, formatted_id, title, ticket_type, epic_id,
    original_fe_estimate, original_be_estimate, original_project_estimate,
    current_fe_estimate, current_be_estimate, current_project_estimate,
    fe_status, be_status, position, created_at
  )
  SELECT
    _pid, a.rn::int, 'TMP', a.ticket_name, a.t_type,
    e.id,
    CASE WHEN a.t_type = 'Proj' THEN NULL ELSE a.fe_est END,
    CASE WHEN a.t_type = 'Proj' THEN NULL ELSE a.be_est END,
    CASE WHEN a.t_type = 'Proj' THEN COALESCE(a.pj_est, 0) ELSE a.pj_est END,
    CASE WHEN a.t_type = 'Proj' THEN NULL ELSE a.fe_actual END,
    CASE WHEN a.t_type = 'Proj' THEN NULL ELSE a.be_actual END,
    CASE WHEN a.t_type = 'Proj'
         THEN COALESCE(a.pj_actual, 0) + COALESCE(a.fe_actual, 0) + COALESCE(a.be_actual, 0)
         ELSE a.pj_actual END,
    CASE WHEN a.t_type = 'Proj' OR a.fe_last IS NULL THEN NULL
         WHEN a.fe_last >= _recent THEN 'in_progress'::public.discipline_status
         ELSE 'done'::public.discipline_status END,
    CASE WHEN a.t_type = 'Proj' OR a.be_last IS NULL THEN NULL
         WHEN a.be_last >= _recent THEN 'in_progress'::public.discipline_status
         ELSE 'done'::public.discipline_status END,
    a.rn::int,
    a.created_date::timestamptz
  FROM agg a
  LEFT JOIN public.project_epics e ON e.project_id = _pid AND e.epic_name = a.epic
  RETURNING id, title, epic_id
)
INSERT INTO public.import_cou_map (ticket_name, epic, ticket_id)
SELECT ins.title, e.epic_name, ins.id
FROM ins LEFT JOIN public.project_epics e ON e.id = ins.epic_id;

INSERT INTO public.ticket_assignees (ticket_id, user_id, slot)
SELECT DISTINCT m.ticket_id, l.assignee,
  CASE l.discipline WHEN 'FE' THEN 'FE' WHEN 'BE' THEN 'BE' ELSE 'Project' END::public.assignee_slot
FROM public.import_cou_logs l
JOIN public.import_cou_map m
  ON m.ticket_name = l.ticket_name AND m.epic IS NOT DISTINCT FROM l.epic
ON CONFLICT DO NOTHING;

INSERT INTO public.time_logs (ticket_id, user_id, discipline, hours, note, source, logged_at)
SELECT m.ticket_id, l.assignee,
  CASE l.discipline WHEN 'FE' THEN 'FE' WHEN 'BE' THEN 'BE' ELSE 'Project' END::public.log_discipline,
  l.hours, l.note, 'manual'::public.log_source,
  (l.log_date + COALESCE(l.start_time, '00:00'::time))::timestamptz
FROM public.import_cou_logs l
JOIN public.import_cou_map m
  ON m.ticket_name = l.ticket_name AND m.epic IS NOT DISTINCT FROM l.epic
WHERE l.hours > 0;

DROP TABLE public.import_cou_map;
DROP TABLE public.import_cou_logs;

END $$;