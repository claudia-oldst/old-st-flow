-- 1. Fix rehydrate_project: don't pre-load actuals from snapshot; let the
--    time_logs AFTER INSERT trigger rebuild them. Otherwise actuals double
--    (snapshot value + trigger increment from replayed logs).
DROP FUNCTION IF EXISTS public.rehydrate_project(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.rehydrate_project(_project_id uuid, _payload jsonb, _member_map jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Tickets: insert with actuals = 0. The time_logs AFTER INSERT trigger
  -- below will rebuild actual_frontend_hours / actual_backend_hours /
  -- actual_project_hours from the replayed time_logs.
  INSERT INTO public.tickets (
    id, project_id, ticket_number, formatted_id, title, ticket_type,
    status_id, fe_status, be_status, project_status_override,
    epic_id, version,
    original_fe_estimate, original_be_estimate, original_project_estimate,
    current_fe_estimate, current_be_estimate, current_project_estimate,
    actual_frontend_hours, actual_backend_hours, actual_project_hours,
    acceptance_criteria, position,
    cr_approval, cr_decided_at, cr_decided_by,
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
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'tickets') r;

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

  PERFORM set_config('app.allow_unarchive', 'off', true);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rehydrate_project(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

-- 2. Repair already-rehydrated tickets: recompute actuals from time_logs.
WITH s AS (
  SELECT ticket_id,
         SUM(hours) FILTER (WHERE discipline='FE')      AS fe,
         SUM(hours) FILTER (WHERE discipline='BE')      AS be,
         SUM(hours) FILTER (WHERE discipline='Project') AS pj
  FROM public.time_logs
  GROUP BY ticket_id
)
UPDATE public.tickets t
SET actual_frontend_hours = COALESCE(s.fe, 0),
    actual_backend_hours  = COALESCE(s.be, 0),
    actual_project_hours  = COALESCE(s.pj, 0)
FROM s
WHERE s.ticket_id = t.id
  AND (t.actual_frontend_hours <> COALESCE(s.fe, 0)
    OR t.actual_backend_hours  <> COALESCE(s.be, 0)
    OR t.actual_project_hours  <> COALESCE(s.pj, 0));

-- Also zero out tickets that now have no logs but still hold residual actuals.
UPDATE public.tickets t
SET actual_frontend_hours = 0,
    actual_backend_hours = 0,
    actual_project_hours = 0
WHERE NOT EXISTS (SELECT 1 FROM public.time_logs l WHERE l.ticket_id = t.id)
  AND (t.actual_frontend_hours <> 0
    OR t.actual_backend_hours <> 0
    OR t.actual_project_hours <> 0);
