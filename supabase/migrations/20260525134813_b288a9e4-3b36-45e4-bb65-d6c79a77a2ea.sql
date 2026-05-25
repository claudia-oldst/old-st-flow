
-- ---------- 1. user_roles table -------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('PMBA', 'member');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "user_roles: self or pmba read" ON public.user_roles;
CREATE POLICY "user_roles: self or pmba read"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = public.current_team_member_id() OR public.current_is_pmba());

DROP POLICY IF EXISTS "user_roles: pmba write" ON public.user_roles;
CREATE POLICY "user_roles: pmba write"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.current_is_pmba())
  WITH CHECK (public.current_is_pmba());

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'PMBA'::public.app_role FROM public.team_members WHERE role = 'PMBA'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'::public.app_role FROM public.team_members WHERE role <> 'PMBA'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_team_member_role_to_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles
    WHERE user_id = NEW.id
      AND role <> (CASE WHEN NEW.role = 'PMBA' THEN 'PMBA'::public.app_role ELSE 'member'::public.app_role END);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.role = 'PMBA' THEN 'PMBA'::public.app_role ELSE 'member'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_member_role ON public.team_members;
CREATE TRIGGER trg_sync_team_member_role
  AFTER INSERT OR UPDATE OF role ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_member_role_to_user_roles();

-- ---------- 2. is_pmba / current_is_pmba use user_roles ------------------------
CREATE OR REPLACE FUNCTION public.current_is_pmba()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(public.current_team_member_id(), 'PMBA'::public.app_role) $$;

CREATE OR REPLACE FUNCTION public.is_pmba(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'PMBA'::public.app_role) $$;

-- ---------- 3. Revoke EXECUTE on internal definer functions -------------------
DO $$
DECLARE
  fn text;
  keep text[] := ARRAY[
    'get_client_portal(text)',
    'get_client_portal_change_requests(text)',
    'client_approve_cr(text,uuid)',
    'rotate_client_portal_hash(uuid)'
  ];
BEGIN
  FOR fn IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    IF NOT (fn = ANY(keep)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated, PUBLIC', fn);
    END IF;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;

-- ---------- 4. Tighten team_members SELECT ------------------------------------
DROP POLICY IF EXISTS "team_members: read all authed" ON public.team_members;
DROP POLICY IF EXISTS "team_members: scoped read" ON public.team_members;
CREATE POLICY "team_members: scoped read"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    id = public.current_team_member_id()
    OR public.current_is_pmba()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm_me
      JOIN public.project_members pm_them ON pm_them.project_id = pm_me.project_id
      WHERE pm_me.user_id = public.current_team_member_id()
        AND pm_them.user_id = public.team_members.id
    )
  );

-- ---------- 5. Tighten ticket-attachments storage policies --------------------
DROP POLICY IF EXISTS "ticket-attachments insertable by all" ON storage.objects;
DROP POLICY IF EXISTS "ticket-attachments: insert by ticket access" ON storage.objects;
CREATE POLICY "ticket-attachments: insert by ticket access"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public.current_can_access_ticket(
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

DROP POLICY IF EXISTS "ticket-attachments updatable by all" ON storage.objects;
DROP POLICY IF EXISTS "ticket-attachments: update by ticket access" ON storage.objects;
CREATE POLICY "ticket-attachments: update by ticket access"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND public.current_can_access_ticket(
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

DROP POLICY IF EXISTS "ticket-attachments deletable by all" ON storage.objects;
DROP POLICY IF EXISTS "ticket-attachments: delete by ticket access" ON storage.objects;
CREATE POLICY "ticket-attachments: delete by ticket access"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND public.current_can_access_ticket(
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

-- ---------- 6. Client portal hash: lookup by SHA-256 hash ---------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_portal_hash_sha text;

CREATE INDEX IF NOT EXISTS projects_client_portal_hash_sha_idx
  ON public.projects (client_portal_hash_sha)
  WHERE client_portal_hash_sha IS NOT NULL;

UPDATE public.projects
   SET client_portal_hash_sha = encode(digest(client_portal_hash, 'sha256'), 'hex')
 WHERE client_portal_hash IS NOT NULL
   AND client_portal_hash_sha IS NULL;

CREATE OR REPLACE FUNCTION public.rotate_client_portal_hash(_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_token text;
BEGIN
  IF NOT public.current_is_pmba() THEN
    RAISE EXCEPTION 'PMBA role required';
  END IF;
  new_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.projects
     SET client_portal_hash = new_token,
         client_portal_hash_sha = encode(digest(new_token, 'sha256'), 'hex')
   WHERE id = _project_id;
  RETURN new_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_portal(_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  proj public.projects%ROWTYPE;
  cutoff timestamptz;
  rate numeric;
  result jsonb;
  hashed text;
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
    SELECT t.id, t.formatted_id, t.title, t.epic_id, t.fe_status, t.be_status,
      t.current_fe_estimate, t.current_be_estimate, t.current_project_estimate,
      t.original_fe_estimate, t.original_be_estimate, t.original_project_estimate,
      COALESCE(th.fe_hours, 0) AS actual_fe,
      COALESCE(th.be_hours, 0) AS actual_be,
      COALESCE(th.proj_hours, 0) AS actual_proj,
      s.category AS status_category
    FROM public.tickets t
    LEFT JOIN ticket_hours th ON th.ticket_id = t.id
    LEFT JOIN public.statuses s ON s.id = t.status_id
    WHERE t.project_id = proj.id AND t.created_at <= cutoff
  ),
  epic_rows AS (
    SELECT e.id, e.epic_name,
      COUNT(tr.id)::int AS total_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'backlog')::int AS backlog_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'active')::int AS in_progress_tickets,
      COUNT(tr.id) FILTER (WHERE tr.status_category = 'done')::int AS done_tickets,
      COALESCE(SUM(tr.current_fe_estimate + tr.current_be_estimate + tr.current_project_estimate), 0) AS current_estimate,
      COALESCE(SUM(tr.original_fe_estimate + tr.original_be_estimate + tr.original_project_estimate), 0) AS original_estimate,
      COALESCE(SUM(tr.actual_fe + tr.actual_be + tr.actual_proj), 0) AS actual_hours
    FROM public.project_epics e
    LEFT JOIN ticket_rows tr ON tr.epic_id = e.id
    WHERE e.project_id = proj.id
    GROUP BY e.id, e.epic_name
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
        'tickets_total', COUNT(*),
        'tickets_backlog', COUNT(*) FILTER (WHERE status_category = 'backlog'),
        'tickets_in_progress', COUNT(*) FILTER (WHERE status_category = 'active'),
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
$$;

CREATE OR REPLACE FUNCTION public.get_client_portal_change_requests(_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _project_id uuid;
  _result jsonb;
  hashed text;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN NULL; END IF;
  hashed := encode(digest(_hash, 'sha256'), 'hex');

  SELECT id INTO _project_id FROM public.projects
   WHERE client_portal_hash_sha = hashed
      OR client_portal_hash = _hash
   LIMIT 1;
  IF _project_id IS NULL THEN RETURN NULL; END IF;

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
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_approve_cr(_hash text, _ticket_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _project_id uuid;
  _updated int;
  hashed text;
BEGIN
  IF _hash IS NULL OR length(_hash) < 8 THEN RETURN false; END IF;
  hashed := encode(digest(_hash, 'sha256'), 'hex');

  SELECT id INTO _project_id FROM public.projects
   WHERE client_portal_hash_sha = hashed
      OR client_portal_hash = _hash
   LIMIT 1;
  IF _project_id IS NULL THEN RETURN false; END IF;

  UPDATE public.tickets
     SET cr_approval = 'approved', cr_decided_at = now(), cr_decided_by = NULL
   WHERE id = _ticket_id
     AND project_id = _project_id
     AND ticket_type = 'CR'
     AND cr_approval = 'pending';

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_change_requests(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_approve_cr(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_client_portal_hash(uuid) TO authenticated;
