-- ============================================================
-- Tighten RLS: scope data to PMBA + project members
-- Identity mapping: auth.jwt() email -> team_members.id
-- ============================================================

-- Helper: resolve current signed-in user to a team_members.id
CREATE OR REPLACE FUNCTION public.current_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.team_members
  WHERE lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_is_pmba()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
      AND role = 'PMBA'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_is_project_member(_pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = _pid
      AND pm.user_id = public.current_team_member_id()
  )
$$;

-- Convenience: can the current user touch this ticket's project?
CREATE OR REPLACE FUNCTION public.current_can_access_ticket(_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_is_pmba()
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = _ticket_id
          AND public.current_is_project_member(t.project_id)
      )
$$;

-- ============================================================
-- PROJECTS
-- ============================================================
DROP POLICY IF EXISTS "projects readable by all" ON public.projects;
DROP POLICY IF EXISTS "projects insertable by all v1" ON public.projects;
DROP POLICY IF EXISTS "projects updatable by all v1" ON public.projects;
DROP POLICY IF EXISTS "projects deletable by all v1" ON public.projects;

CREATE POLICY "projects: select members or pmba"
  ON public.projects FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(id));

CREATE POLICY "projects: pmba writes insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "projects: pmba writes update"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.current_is_pmba())
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "projects: pmba writes delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.current_is_pmba());

-- ============================================================
-- PROJECT_MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "project_members readable by all" ON public.project_members;
DROP POLICY IF EXISTS "project_members insertable by all v1" ON public.project_members;
DROP POLICY IF EXISTS "project_members updatable by all v1" ON public.project_members;
DROP POLICY IF EXISTS "project_members deletable by all v1" ON public.project_members;

CREATE POLICY "project_members: select scoped"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "project_members: pmba insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "project_members: pmba update"
  ON public.project_members FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "project_members: pmba delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (public.current_is_pmba());

-- ============================================================
-- PROJECT_EPICS  (PMBA + project members can manage)
-- ============================================================
DROP POLICY IF EXISTS "project_epics readable by all" ON public.project_epics;
DROP POLICY IF EXISTS "project_epics insertable by all v1" ON public.project_epics;
DROP POLICY IF EXISTS "project_epics updatable by all v1" ON public.project_epics;
DROP POLICY IF EXISTS "project_epics deletable by all v1" ON public.project_epics;

CREATE POLICY "project_epics: select scoped" ON public.project_epics
  FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "project_epics: insert scoped" ON public.project_epics
  FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "project_epics: update scoped" ON public.project_epics
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id))
  WITH CHECK (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "project_epics: delete scoped" ON public.project_epics
  FOR DELETE TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

-- ============================================================
-- PROJECT_EPIC_SUMMARIES  (portal config — PMBA only writes, members read)
-- ============================================================
DROP POLICY IF EXISTS "epic summaries readable by all" ON public.project_epic_summaries;
DROP POLICY IF EXISTS "epic summaries insertable by all" ON public.project_epic_summaries;
DROP POLICY IF EXISTS "epic summaries updatable by all" ON public.project_epic_summaries;
DROP POLICY IF EXISTS "epic summaries deletable by all" ON public.project_epic_summaries;

CREATE POLICY "epic_summaries: select scoped" ON public.project_epic_summaries
  FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "epic_summaries: pmba insert" ON public.project_epic_summaries
  FOR INSERT TO authenticated WITH CHECK (public.current_is_pmba());

CREATE POLICY "epic_summaries: pmba update" ON public.project_epic_summaries
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "epic_summaries: pmba delete" ON public.project_epic_summaries
  FOR DELETE TO authenticated USING (public.current_is_pmba());

-- ============================================================
-- EPIC_DISCOUNTS (PMBA only)
-- ============================================================
DROP POLICY IF EXISTS "epic_discounts readable by all" ON public.epic_discounts;
DROP POLICY IF EXISTS "epic_discounts insertable by all v1" ON public.epic_discounts;
DROP POLICY IF EXISTS "epic_discounts updatable by all v1" ON public.epic_discounts;
DROP POLICY IF EXISTS "epic_discounts deletable by all v1" ON public.epic_discounts;

CREATE POLICY "epic_discounts: select scoped" ON public.epic_discounts
  FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "epic_discounts: pmba insert" ON public.epic_discounts
  FOR INSERT TO authenticated WITH CHECK (public.current_is_pmba());

CREATE POLICY "epic_discounts: pmba update" ON public.epic_discounts
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "epic_discounts: pmba delete" ON public.epic_discounts
  FOR DELETE TO authenticated USING (public.current_is_pmba());

-- ============================================================
-- TICKETS  (PMBA + project members)
-- ============================================================
DROP POLICY IF EXISTS "tickets readable by all" ON public.tickets;
DROP POLICY IF EXISTS "tickets insertable by all v1" ON public.tickets;
DROP POLICY IF EXISTS "tickets updatable by all v1" ON public.tickets;
DROP POLICY IF EXISTS "tickets deletable by all v1" ON public.tickets;

CREATE POLICY "tickets: select scoped" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "tickets: insert scoped" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "tickets: update scoped" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id))
  WITH CHECK (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "tickets: delete scoped" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

-- ============================================================
-- TICKET_ASSIGNEES
-- ============================================================
DROP POLICY IF EXISTS "ticket_assignees readable by all" ON public.ticket_assignees;
DROP POLICY IF EXISTS "ticket_assignees insertable by all v1" ON public.ticket_assignees;
DROP POLICY IF EXISTS "ticket_assignees updatable by all v1" ON public.ticket_assignees;
DROP POLICY IF EXISTS "ticket_assignees deletable by all v1" ON public.ticket_assignees;

CREATE POLICY "ticket_assignees: select scoped" ON public.ticket_assignees
  FOR SELECT TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

CREATE POLICY "ticket_assignees: insert scoped" ON public.ticket_assignees
  FOR INSERT TO authenticated
  WITH CHECK (public.current_can_access_ticket(ticket_id));

CREATE POLICY "ticket_assignees: update scoped" ON public.ticket_assignees
  FOR UPDATE TO authenticated
  USING (public.current_can_access_ticket(ticket_id))
  WITH CHECK (public.current_can_access_ticket(ticket_id));

CREATE POLICY "ticket_assignees: delete scoped" ON public.ticket_assignees
  FOR DELETE TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

-- ============================================================
-- TICKET_COMMENTS  (author owns; PMBA can manage all)
-- ============================================================
DROP POLICY IF EXISTS "ticket_comments readable by all" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments insertable by all" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments updatable by all" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments deletable by all" ON public.ticket_comments;

CREATE POLICY "ticket_comments: select scoped" ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

CREATE POLICY "ticket_comments: insert own" ON public.ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_can_access_ticket(ticket_id)
    AND user_id = public.current_team_member_id()
  );

CREATE POLICY "ticket_comments: update author or pmba" ON public.ticket_comments
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba() OR user_id = public.current_team_member_id())
  WITH CHECK (public.current_is_pmba() OR user_id = public.current_team_member_id());

CREATE POLICY "ticket_comments: delete author or pmba" ON public.ticket_comments
  FOR DELETE TO authenticated
  USING (public.current_is_pmba() OR user_id = public.current_team_member_id());

-- ============================================================
-- TICKET_ESTIMATE_CHANGES
-- ============================================================
DROP POLICY IF EXISTS "ticket_estimate_changes readable by all" ON public.ticket_estimate_changes;
DROP POLICY IF EXISTS "ticket_estimate_changes insertable by all v1" ON public.ticket_estimate_changes;
DROP POLICY IF EXISTS "ticket_estimate_changes updatable by all v1" ON public.ticket_estimate_changes;
DROP POLICY IF EXISTS "ticket_estimate_changes deletable by all v1" ON public.ticket_estimate_changes;

CREATE POLICY "estimate_changes: select scoped" ON public.ticket_estimate_changes
  FOR SELECT TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

CREATE POLICY "estimate_changes: insert scoped" ON public.ticket_estimate_changes
  FOR INSERT TO authenticated
  WITH CHECK (public.current_can_access_ticket(ticket_id));

CREATE POLICY "estimate_changes: update scoped" ON public.ticket_estimate_changes
  FOR UPDATE TO authenticated
  USING (public.current_can_access_ticket(ticket_id))
  WITH CHECK (public.current_can_access_ticket(ticket_id));

CREATE POLICY "estimate_changes: delete pmba" ON public.ticket_estimate_changes
  FOR DELETE TO authenticated
  USING (public.current_is_pmba());

-- ============================================================
-- TIME_LOGS  (own logs; PMBA can manage all)
-- ============================================================
DROP POLICY IF EXISTS "time_logs readable by all" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs insertable by all v1" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs updatable by all v1" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs deletable by all v1" ON public.time_logs;

CREATE POLICY "time_logs: select scoped" ON public.time_logs
  FOR SELECT TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

CREATE POLICY "time_logs: insert own" ON public.time_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_can_access_ticket(ticket_id)
    AND (public.current_is_pmba() OR user_id = public.current_team_member_id())
  );

CREATE POLICY "time_logs: update own or pmba" ON public.time_logs
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba() OR user_id = public.current_team_member_id())
  WITH CHECK (public.current_is_pmba() OR user_id = public.current_team_member_id());

CREATE POLICY "time_logs: delete own or pmba" ON public.time_logs
  FOR DELETE TO authenticated
  USING (public.current_is_pmba() OR user_id = public.current_team_member_id());

-- ============================================================
-- ACTIVE_TIMERS  (own only; readable to project members for visibility)
-- ============================================================
DROP POLICY IF EXISTS "active_timers readable by all" ON public.active_timers;
DROP POLICY IF EXISTS "active_timers insertable by all v1" ON public.active_timers;
DROP POLICY IF EXISTS "active_timers updatable by all v1" ON public.active_timers;
DROP POLICY IF EXISTS "active_timers deletable by all v1" ON public.active_timers;

CREATE POLICY "active_timers: select scoped" ON public.active_timers
  FOR SELECT TO authenticated
  USING (public.current_can_access_ticket(ticket_id));

CREATE POLICY "active_timers: insert own" ON public.active_timers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_team_member_id());

CREATE POLICY "active_timers: update own" ON public.active_timers
  FOR UPDATE TO authenticated
  USING (user_id = public.current_team_member_id())
  WITH CHECK (user_id = public.current_team_member_id());

CREATE POLICY "active_timers: delete own" ON public.active_timers
  FOR DELETE TO authenticated
  USING (user_id = public.current_team_member_id());

-- ============================================================
-- ACTIVE_TIMER_TICKETS  (own only)
-- ============================================================
DROP POLICY IF EXISTS "active_timer_tickets readable by all" ON public.active_timer_tickets;
DROP POLICY IF EXISTS "active_timer_tickets insertable by all v1" ON public.active_timer_tickets;
DROP POLICY IF EXISTS "active_timer_tickets updatable by all v1" ON public.active_timer_tickets;
DROP POLICY IF EXISTS "active_timer_tickets deletable by all v1" ON public.active_timer_tickets;

CREATE POLICY "active_timer_tickets: select own" ON public.active_timer_tickets
  FOR SELECT TO authenticated
  USING (user_id = public.current_team_member_id() OR public.current_is_pmba());

CREATE POLICY "active_timer_tickets: insert own" ON public.active_timer_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_team_member_id());

CREATE POLICY "active_timer_tickets: update own" ON public.active_timer_tickets
  FOR UPDATE TO authenticated
  USING (user_id = public.current_team_member_id())
  WITH CHECK (user_id = public.current_team_member_id());

CREATE POLICY "active_timer_tickets: delete own" ON public.active_timer_tickets
  FOR DELETE TO authenticated
  USING (user_id = public.current_team_member_id());

-- ============================================================
-- TEAM_MEMBERS  (everyone authed can read for avatars/picker; PMBA writes)
-- ============================================================
DROP POLICY IF EXISTS "team_members readable by all" ON public.team_members;
DROP POLICY IF EXISTS "team_members writable by all v1" ON public.team_members;
DROP POLICY IF EXISTS "team_members updatable by all v1" ON public.team_members;
DROP POLICY IF EXISTS "team_members deletable by all v1" ON public.team_members;

CREATE POLICY "team_members: read all authed" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members: pmba insert" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (public.current_is_pmba());

CREATE POLICY "team_members: pmba update" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "team_members: pmba delete" ON public.team_members
  FOR DELETE TO authenticated USING (public.current_is_pmba());

-- ============================================================
-- STATUSES  (readable to all authed; PMBA writes)
-- ============================================================
DROP POLICY IF EXISTS "statuses readable by all" ON public.statuses;
DROP POLICY IF EXISTS "statuses insertable by all v1" ON public.statuses;
DROP POLICY IF EXISTS "statuses updatable by all v1" ON public.statuses;
DROP POLICY IF EXISTS "statuses deletable by all v1" ON public.statuses;

CREATE POLICY "statuses: read all authed" ON public.statuses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "statuses: pmba insert" ON public.statuses
  FOR INSERT TO authenticated WITH CHECK (public.current_is_pmba());

CREATE POLICY "statuses: pmba update" ON public.statuses
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "statuses: pmba delete" ON public.statuses
  FOR DELETE TO authenticated USING (public.current_is_pmba());

-- ============================================================
-- STATUS_DERIVATION_RULES  (readable to all authed; PMBA writes)
-- ============================================================
DROP POLICY IF EXISTS "status_derivation_rules readable by all" ON public.status_derivation_rules;
DROP POLICY IF EXISTS "status_derivation_rules insertable by all v1" ON public.status_derivation_rules;
DROP POLICY IF EXISTS "status_derivation_rules updatable by all v1" ON public.status_derivation_rules;
DROP POLICY IF EXISTS "status_derivation_rules deletable by all v1" ON public.status_derivation_rules;

CREATE POLICY "status_rules: read all authed" ON public.status_derivation_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "status_rules: pmba insert" ON public.status_derivation_rules
  FOR INSERT TO authenticated WITH CHECK (public.current_is_pmba());

CREATE POLICY "status_rules: pmba update" ON public.status_derivation_rules
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());

CREATE POLICY "status_rules: pmba delete" ON public.status_derivation_rules
  FOR DELETE TO authenticated USING (public.current_is_pmba());
