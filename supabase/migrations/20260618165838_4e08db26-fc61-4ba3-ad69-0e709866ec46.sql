-- Archive/Rehydrate: cover sprints, epic_discounts, bug parent links,
-- planned sprint columns, and GitHub linkage.

-- 1. Archive payload: include sprints, sprint_capacities, sprint_tickets, epic_discounts
CREATE OR REPLACE FUNCTION public.get_project_archive_payload(_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'version', 2,
    'project', (SELECT to_jsonb(p) FROM public.projects p WHERE p.id = _project_id),
    'project_members', COALESCE((SELECT jsonb_agg(to_jsonb(pm)) FROM public.project_members pm WHERE pm.project_id = _project_id), '[]'::jsonb),
    'project_epics', COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM public.project_epics e WHERE e.project_id = _project_id), '[]'::jsonb),
    'project_epic_summaries', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.project_epic_summaries s WHERE s.project_id = _project_id), '[]'::jsonb),
    'epic_discounts', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.epic_discounts d WHERE d.project_id = _project_id), '[]'::jsonb),
    'tickets', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.tickets t WHERE t.project_id = _project_id), '[]'::jsonb),
    'ticket_assignees', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.ticket_assignees a WHERE a.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'ticket_comments', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.ticket_comments c WHERE c.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'ticket_estimate_changes', COALESCE((SELECT jsonb_agg(to_jsonb(ec)) FROM public.ticket_estimate_changes ec WHERE ec.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'time_logs', COALESCE((SELECT jsonb_agg(to_jsonb(tl)) FROM public.time_logs tl WHERE tl.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'sprints', COALESCE((SELECT jsonb_agg(to_jsonb(sp)) FROM public.sprints sp WHERE sp.project_id = _project_id), '[]'::jsonb),
    'sprint_capacities', COALESCE((SELECT jsonb_agg(to_jsonb(sc)) FROM public.sprint_capacities sc WHERE sc.sprint_id IN (SELECT id FROM public.sprints WHERE project_id = _project_id)), '[]'::jsonb),
    'sprint_tickets', COALESCE((SELECT jsonb_agg(to_jsonb(st)) FROM public.sprint_tickets st WHERE st.sprint_id IN (SELECT id FROM public.sprints WHERE project_id = _project_id)), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$function$;

-- 2. Purge: also delete sprint_* and epic_discounts
CREATE OR REPLACE FUNCTION public.purge_project_children(_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  counts jsonb;
  ticket_ids uuid[];
  sprint_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ticket_ids FROM public.tickets WHERE project_id = _project_id;
  SELECT array_agg(id) INTO sprint_ids FROM public.sprints WHERE project_id = _project_id;

  WITH
    del_logs AS (DELETE FROM public.time_logs WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_changes AS (DELETE FROM public.ticket_estimate_changes WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_comments AS (DELETE FROM public.ticket_comments WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_assignees AS (DELETE FROM public.ticket_assignees WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_active_tt AS (DELETE FROM public.active_timer_tickets WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_active_t AS (DELETE FROM public.active_timers WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_summaries AS (DELETE FROM public.project_epic_summaries WHERE project_id = _project_id RETURNING 1),
    del_discounts AS (DELETE FROM public.epic_discounts WHERE project_id = _project_id RETURNING 1),
    del_sprint_tk AS (DELETE FROM public.sprint_tickets WHERE sprint_id = ANY(sprint_ids) RETURNING 1),
    del_sprint_cap AS (DELETE FROM public.sprint_capacities WHERE sprint_id = ANY(sprint_ids) RETURNING 1),
    -- Clear planned-sprint refs on tickets so we can drop sprints before tickets.
    clear_planned AS (UPDATE public.tickets
                        SET planned_sprint_fe_id = NULL,
                            planned_sprint_be_id = NULL
                        WHERE project_id = _project_id
                          AND (planned_sprint_fe_id IS NOT NULL OR planned_sprint_be_id IS NOT NULL)
                        RETURNING 1),
    del_sprints AS (DELETE FROM public.sprints WHERE project_id = _project_id RETURNING 1),
    del_tickets AS (DELETE FROM public.tickets WHERE project_id = _project_id RETURNING 1),
    del_epics AS (DELETE FROM public.project_epics WHERE project_id = _project_id RETURNING 1),
    del_members AS (DELETE FROM public.project_members WHERE project_id = _project_id RETURNING 1)
  SELECT jsonb_build_object(
    'time_logs', (SELECT count(*) FROM del_logs),
    'ticket_estimate_changes', (SELECT count(*) FROM del_changes),
    'ticket_comments', (SELECT count(*) FROM del_comments),
    'ticket_assignees', (SELECT count(*) FROM del_assignees),
    'active_timer_tickets', (SELECT count(*) FROM del_active_tt),
    'active_timers', (SELECT count(*) FROM del_active_t),
    'project_epic_summaries', (SELECT count(*) FROM del_summaries),
    'epic_discounts', (SELECT count(*) FROM del_discounts),
    'sprint_tickets', (SELECT count(*) FROM del_sprint_tk),
    'sprint_capacities', (SELECT count(*) FROM del_sprint_cap),
    'sprints', (SELECT count(*) FROM del_sprints),
    'tickets', (SELECT count(*) FROM del_tickets),
    'project_epics', (SELECT count(*) FROM del_epics),
    'project_members', (SELECT count(*) FROM del_members)
  ) INTO counts;

  RETURN counts;
END;
$function$;

-- 3. Rehydrate: include sprints, capacities, sprint_tickets, epic_discounts,
--    plus ticket parent/bug/planned-sprint/github columns.
CREATE OR REPLACE FUNCTION public.rehydrate_project(_project_id uuid, _payload jsonb, _member_map jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proj jsonb;
BEGIN
  proj := _payload->'project';
  IF proj IS NULL OR (proj->>'id')::uuid <> _project_id THEN
    RAISE EXCEPTION 'Payload project id does not match';
  END IF;

  PERFORM set_config('app.allow_unarchive', 'on', true);

  UPDATE public.projects SET
    name = proj->>'name',
    acronym = proj->>'acronym',
    client_name = proj->>'client_name',
    rate_per_hour = COALESCE((proj->>'rate_per_hour')::numeric, 0),
    start_date = NULLIF(proj->>'start_date','')::date,
    links = COALESCE(proj->'links', '[]'::jsonb),
    client_portal_hash = NULLIF(proj->>'client_portal_hash',''),
    client_visibility_cutoff = NULLIF(proj->>'client_visibility_cutoff','')::timestamptz,
    client_summary_published = proj->>'client_summary_published',
    client_summary_draft = proj->>'client_summary_draft',
    client_summary_updated_at = NULLIF(proj->>'client_summary_updated_at','')::timestamptz,
    is_archived = false,
    archived_at = NULL,
    vault_storage_path = NULL,
    vault_checksum = NULL,
    vault_row_counts = NULL,
    cached_total_hours = 0,
    cached_total_cost = 0
  WHERE id = _project_id;

  INSERT INTO public.project_members (project_id, user_id, role, created_at)
  SELECT
    (r->>'project_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'role')::project_role,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'project_members') r;

  INSERT INTO public.project_epics (id, project_id, epic_name, created_at)
  SELECT
    (r->>'id')::bigint,
    (r->>'project_id')::uuid,
    r->>'epic_name',
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'project_epics') r;

  PERFORM setval(
    pg_get_serial_sequence('public.project_epics','id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.project_epics), 1)
  );

  -- Sprints must exist before tickets so planned_sprint_*_id FKs resolve.
  INSERT INTO public.sprints (id, project_id, sprint_number, name, start_date, end_date, created_at, updated_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'project_id')::uuid,
    (r->>'sprint_number')::int,
    r->>'name',
    (r->>'start_date')::date,
    (r->>'end_date')::date,
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(_payload->'sprints', '[]'::jsonb)) r;

  -- Non-bug tickets first so bug parents exist when bug rows insert.
  INSERT INTO public.tickets (
    id, project_id, ticket_number, formatted_id, title, ticket_type,
    status_id, fe_status, be_status, project_status_override,
    epic_id, version,
    original_fe_estimate, original_be_estimate, original_project_estimate,
    current_fe_estimate, current_be_estimate, current_project_estimate,
    actual_frontend_hours, actual_backend_hours, actual_project_hours,
    acceptance_criteria, position,
    cr_approval, cr_decided_at, cr_decided_by,
    planned_sprint_fe_id, planned_sprint_be_id,
    github_issue_number, github_issue_node_id,
    created_at, updated_at
  )
  SELECT
    (r->>'id')::uuid,
    (r->>'project_id')::uuid,
    (r->>'ticket_number')::int,
    r->>'formatted_id',
    r->>'title',
    (r->>'ticket_type')::ticket_type,
    NULLIF(r->>'status_id','')::uuid,
    (r->>'fe_status')::discipline_status,
    (r->>'be_status')::discipline_status,
    COALESCE((r->>'project_status_override')::boolean, false),
    NULLIF(r->>'epic_id','')::bigint,
    r->>'version',
    COALESCE((r->>'original_fe_estimate')::numeric, 0),
    COALESCE((r->>'original_be_estimate')::numeric, 0),
    COALESCE((r->>'original_project_estimate')::numeric, 0),
    COALESCE((r->>'current_fe_estimate')::numeric, 0),
    COALESCE((r->>'current_be_estimate')::numeric, 0),
    COALESCE((r->>'current_project_estimate')::numeric, 0),
    0, 0, 0,
    r->>'acceptance_criteria',
    COALESCE((r->>'position')::int, 0),
    COALESCE(r->>'cr_approval', 'pending'),
    NULLIF(r->>'cr_decided_at','')::timestamptz,
    COALESCE((_member_map->>(r->>'cr_decided_by'))::uuid, NULLIF(r->>'cr_decided_by','')::uuid),
    NULLIF(r->>'planned_sprint_fe_id','')::uuid,
    NULLIF(r->>'planned_sprint_be_id','')::uuid,
    NULLIF(r->>'github_issue_number','')::int,
    NULLIF(r->>'github_issue_node_id',''),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'tickets') r
  WHERE NULLIF(r->>'parent_ticket_id','') IS NULL;

  -- Bug tickets in original sub-number order so enforce_bug_parent trigger
  -- regenerates the same :NN suffix sequence.
  INSERT INTO public.tickets (
    id, project_id, ticket_number, formatted_id, title, ticket_type,
    status_id, fe_status, be_status, project_status_override,
    epic_id, version,
    original_fe_estimate, original_be_estimate, original_project_estimate,
    current_fe_estimate, current_be_estimate, current_project_estimate,
    actual_frontend_hours, actual_backend_hours, actual_project_hours,
    acceptance_criteria, position,
    cr_approval, cr_decided_at, cr_decided_by,
    parent_ticket_id,
    planned_sprint_fe_id, planned_sprint_be_id,
    github_issue_number, github_issue_node_id,
    created_at, updated_at
  )
  SELECT
    (r->>'id')::uuid,
    (r->>'project_id')::uuid,
    (r->>'ticket_number')::int,
    r->>'formatted_id',
    r->>'title',
    (r->>'ticket_type')::ticket_type,
    NULLIF(r->>'status_id','')::uuid,
    (r->>'fe_status')::discipline_status,
    (r->>'be_status')::discipline_status,
    COALESCE((r->>'project_status_override')::boolean, false),
    NULLIF(r->>'epic_id','')::bigint,
    r->>'version',
    COALESCE((r->>'original_fe_estimate')::numeric, 0),
    COALESCE((r->>'original_be_estimate')::numeric, 0),
    COALESCE((r->>'original_project_estimate')::numeric, 0),
    COALESCE((r->>'current_fe_estimate')::numeric, 0),
    COALESCE((r->>'current_be_estimate')::numeric, 0),
    COALESCE((r->>'current_project_estimate')::numeric, 0),
    0, 0, 0,
    r->>'acceptance_criteria',
    COALESCE((r->>'position')::int, 0),
    COALESCE(r->>'cr_approval', 'pending'),
    NULLIF(r->>'cr_decided_at','')::timestamptz,
    COALESCE((_member_map->>(r->>'cr_decided_by'))::uuid, NULLIF(r->>'cr_decided_by','')::uuid),
    NULLIF(r->>'parent_ticket_id','')::uuid,
    NULLIF(r->>'planned_sprint_fe_id','')::uuid,
    NULLIF(r->>'planned_sprint_be_id','')::uuid,
    NULLIF(r->>'github_issue_number','')::int,
    NULLIF(r->>'github_issue_node_id',''),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'tickets') r
  WHERE NULLIF(r->>'parent_ticket_id','') IS NOT NULL
  ORDER BY COALESCE((r->>'bug_sub_number')::int, 0), (r->>'created_at')::timestamptz;

  INSERT INTO public.ticket_assignees (ticket_id, user_id, slot, created_at)
  SELECT
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'slot')::assignee_slot,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'ticket_assignees') r;

  INSERT INTO public.ticket_comments (id, ticket_id, user_id, parent_id, body, attachments, created_at, edited_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    NULLIF(r->>'parent_id','')::uuid,
    COALESCE(r->>'body',''),
    COALESCE(r->'attachments', '[]'::jsonb),
    COALESCE((r->>'created_at')::timestamptz, now()),
    NULLIF(r->>'edited_at','')::timestamptz
  FROM jsonb_array_elements(_payload->'ticket_comments') r;

  INSERT INTO public.ticket_estimate_changes (
    id, ticket_id, user_id, discipline, previous_hours, new_hours,
    reason, status, decided_by, decided_at, created_at
  )
  SELECT
    (r->>'id')::uuid,
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'discipline')::assignee_slot,
    (r->>'previous_hours')::numeric,
    (r->>'new_hours')::numeric,
    r->>'reason',
    COALESCE(r->>'status','approved'),
    COALESCE((_member_map->>(r->>'decided_by'))::uuid, NULLIF(r->>'decided_by','')::uuid),
    NULLIF(r->>'decided_at','')::timestamptz,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'ticket_estimate_changes') r;

  INSERT INTO public.time_logs (id, ticket_id, user_id, discipline, hours, note, source, logged_at, created_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'discipline')::log_discipline,
    (r->>'hours')::numeric,
    r->>'note',
    COALESCE((r->>'source')::log_source, 'manual'::log_source),
    COALESCE((r->>'logged_at')::timestamptz, now()),
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'time_logs') r;

  INSERT INTO public.project_epic_summaries (id, project_id, epic_id, ai_draft, pmba_text, included, delta_hours, created_at, updated_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'project_id')::uuid,
    (r->>'epic_id')::bigint,
    r->>'ai_draft',
    r->>'pmba_text',
    COALESCE((r->>'included')::boolean, true),
    COALESCE((r->>'delta_hours')::numeric, 0),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'project_epic_summaries') r;

  INSERT INTO public.epic_discounts (id, project_id, epic_id, discipline, hours, reason, created_by, created_at, updated_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'project_id')::uuid,
    (r->>'epic_id')::bigint,
    (r->>'discipline')::assignee_slot,
    (r->>'hours')::numeric,
    r->>'reason',
    COALESCE((_member_map->>(r->>'created_by'))::uuid, NULLIF(r->>'created_by','')::uuid),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(_payload->'epic_discounts', '[]'::jsonb)) r;

  INSERT INTO public.sprint_capacities (id, sprint_id, user_id, discipline, hours, created_at, updated_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'sprint_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'discipline')::assignee_slot,
    COALESCE((r->>'hours')::numeric, 0),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(_payload->'sprint_capacities', '[]'::jsonb)) r;

  INSERT INTO public.sprint_tickets (id, sprint_id, ticket_id, assigned_user_id, created_at, updated_at)
  SELECT
    (r->>'id')::uuid,
    (r->>'sprint_id')::uuid,
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'assigned_user_id'))::uuid, NULLIF(r->>'assigned_user_id','')::uuid),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(_payload->'sprint_tickets', '[]'::jsonb)) r;

  PERFORM set_config('app.allow_unarchive', 'off', true);

  RETURN jsonb_build_object('ok', true);
END;
$function$;