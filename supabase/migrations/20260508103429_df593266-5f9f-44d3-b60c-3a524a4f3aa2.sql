
-- 1. Project Vault columns on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS vault_storage_path text,
  ADD COLUMN IF NOT EXISTS cached_total_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cached_total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vault_checksum text,
  ADD COLUMN IF NOT EXISTS vault_row_counts jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON public.projects (is_archived);

-- 2. PMBA helper (team_members.role-based, matches existing pattern)
CREATE OR REPLACE FUNCTION public.is_pmba(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = _user_id AND role = 'PMBA'
  );
$$;

-- 3. Archive invariant trigger
CREATE OR REPLACE FUNCTION public.enforce_archive_invariants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When archiving, kill the public portal link
  IF NEW.is_archived = true AND COALESCE(OLD.is_archived, false) = false THEN
    NEW.client_portal_hash := NULL;
    IF NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
    END IF;
  END IF;

  -- Block direct un-archive (must go through rehydrate_project RPC which uses session var)
  IF OLD.is_archived = true AND NEW.is_archived = false THEN
    IF current_setting('app.allow_unarchive', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Projects can only be un-archived through the rehydrate flow';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_archive_invariants ON public.projects;
CREATE TRIGGER trg_enforce_archive_invariants
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_archive_invariants();

-- 4. Storage bucket + RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-vault', 'project-vault', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "project-vault PMBA read" ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA write" ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA update" ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA delete" ON storage.objects;

CREATE POLICY "project-vault PMBA read"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-vault');

CREATE POLICY "project-vault PMBA write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-vault');

CREATE POLICY "project-vault PMBA update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-vault');

CREATE POLICY "project-vault PMBA delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-vault');

-- Note: storage RLS is permissive here because the edge functions use the
-- service role key and gate access via is_pmba() at the function entry point,
-- matching the rest of this app's open-RLS / app-layer-gated model.

-- 5. Aggregate project payload for archiving
CREATE OR REPLACE FUNCTION public.get_project_archive_payload(_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'version', 1,
    'project', (SELECT to_jsonb(p) FROM public.projects p WHERE p.id = _project_id),
    'project_members', COALESCE((SELECT jsonb_agg(to_jsonb(pm)) FROM public.project_members pm WHERE pm.project_id = _project_id), '[]'::jsonb),
    'project_epics', COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM public.project_epics e WHERE e.project_id = _project_id), '[]'::jsonb),
    'project_epic_summaries', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.project_epic_summaries s WHERE s.project_id = _project_id), '[]'::jsonb),
    'tickets', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.tickets t WHERE t.project_id = _project_id), '[]'::jsonb),
    'ticket_assignees', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.ticket_assignees a WHERE a.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'ticket_comments', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.ticket_comments c WHERE c.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'ticket_estimate_changes', COALESCE((SELECT jsonb_agg(to_jsonb(ec)) FROM public.ticket_estimate_changes ec WHERE ec.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb),
    'time_logs', COALESCE((SELECT jsonb_agg(to_jsonb(tl)) FROM public.time_logs tl WHERE tl.ticket_id IN (SELECT id FROM public.tickets WHERE project_id = _project_id)), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- 6. Purge child rows in FK-safe order
CREATE OR REPLACE FUNCTION public.purge_project_children(_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counts jsonb;
  ticket_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ticket_ids FROM public.tickets WHERE project_id = _project_id;

  WITH
    del_logs AS (DELETE FROM public.time_logs WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_changes AS (DELETE FROM public.ticket_estimate_changes WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_comments AS (DELETE FROM public.ticket_comments WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_assignees AS (DELETE FROM public.ticket_assignees WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_active_tt AS (DELETE FROM public.active_timer_tickets WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_active_t AS (DELETE FROM public.active_timers WHERE ticket_id = ANY(ticket_ids) RETURNING 1),
    del_summaries AS (DELETE FROM public.project_epic_summaries WHERE project_id = _project_id RETURNING 1),
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
    'tickets', (SELECT count(*) FROM del_tickets),
    'project_epics', (SELECT count(*) FROM del_epics),
    'project_members', (SELECT count(*) FROM del_members)
  ) INTO counts;

  RETURN counts;
END;
$$;

-- 7. Rehydrate from JSON payload (single transaction)
CREATE OR REPLACE FUNCTION public.rehydrate_project(
  _project_id uuid,
  _payload jsonb,
  _member_map jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj jsonb;
  counts jsonb;
BEGIN
  proj := _payload->'project';
  IF proj IS NULL OR (proj->>'id')::uuid <> _project_id THEN
    RAISE EXCEPTION 'Payload project id does not match';
  END IF;

  -- Helper: remap user_id via _member_map (json string → uuid). Falls back to original.
  -- We use jsonb_path with COALESCE on the lookup.

  -- Restore project skeleton fields
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

  -- Project members
  INSERT INTO public.project_members (project_id, user_id, role, created_at)
  SELECT
    (r->>'project_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'role')::project_role,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'project_members') r;

  -- Epics (preserve original bigint ids)
  INSERT INTO public.project_epics (id, project_id, epic_name, created_at)
  SELECT
    (r->>'id')::bigint,
    (r->>'project_id')::uuid,
    r->>'epic_name',
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'project_epics') r;

  -- Bump epics sequence past the max id we restored
  PERFORM setval(
    pg_get_serial_sequence('public.project_epics','id'),
    GREATEST(
      (SELECT COALESCE(MAX(id), 1) FROM public.project_epics),
      1
    )
  );

  -- Tickets (preserve original UUIDs and ticket_numbers; need to bypass before_ticket_insert overrides? — it sets formatted_id from acronym which is fine; but ticket_number assignment only triggers if NULL — we pass it, so it stays.)
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
    COALESCE((r->>'actual_frontend_hours')::numeric, 0),
    COALESCE((r->>'actual_backend_hours')::numeric, 0),
    COALESCE((r->>'actual_project_hours')::numeric, 0),
    r->>'acceptance_criteria',
    COALESCE((r->>'position')::int, 0),
    COALESCE(r->>'cr_approval', 'pending'),
    NULLIF(r->>'cr_decided_at','')::timestamptz,
    COALESCE((_member_map->>(r->>'cr_decided_by'))::uuid, NULLIF(r->>'cr_decided_by','')::uuid),
    COALESCE((r->>'created_at')::timestamptz, now()),
    COALESCE((r->>'updated_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'tickets') r;

  -- Ticket assignees
  INSERT INTO public.ticket_assignees (ticket_id, user_id, slot, created_at)
  SELECT
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'slot')::assignee_slot,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'ticket_assignees') r;

  -- Ticket comments
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

  -- Estimate changes
  INSERT INTO public.ticket_estimate_changes (
    id, ticket_id, user_id, discipline, previous_hours, new_hours, delta,
    reason, status, decided_by, decided_at, created_at
  )
  SELECT
    (r->>'id')::uuid,
    (r->>'ticket_id')::uuid,
    COALESCE((_member_map->>(r->>'user_id'))::uuid, (r->>'user_id')::uuid),
    (r->>'discipline')::assignee_slot,
    (r->>'previous_hours')::numeric,
    (r->>'new_hours')::numeric,
    NULLIF(r->>'delta','')::numeric,
    r->>'reason',
    COALESCE(r->>'status','approved'),
    COALESCE((_member_map->>(r->>'decided_by'))::uuid, NULLIF(r->>'decided_by','')::uuid),
    NULLIF(r->>'decided_at','')::timestamptz,
    COALESCE((r->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(_payload->'ticket_estimate_changes') r;

  -- Time logs
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

  -- Epic summaries
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

  counts := jsonb_build_object(
    'tickets', (SELECT count(*) FROM public.tickets WHERE project_id = _project_id),
    'project_members', (SELECT count(*) FROM public.project_members WHERE project_id = _project_id),
    'project_epics', (SELECT count(*) FROM public.project_epics WHERE project_id = _project_id)
  );

  RETURN counts;
END;
$$;
