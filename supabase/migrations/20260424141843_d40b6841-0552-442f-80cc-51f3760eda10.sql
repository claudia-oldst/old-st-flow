-- ============================================================
-- THE OLD ST TRACKER — Initial schema
-- ============================================================

-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members readable by all"
  ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_members writable by all v1"
  ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "team_members updatable by all v1"
  ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "team_members deletable by all v1"
  ON public.team_members FOR DELETE USING (true);

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  acronym TEXT NOT NULL UNIQUE CHECK (acronym ~ '^[A-Z]{3,5}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects readable by all" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects insertable by all v1" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects updatable by all v1" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "projects deletable by all v1" ON public.projects FOR DELETE USING (true);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TYPE public.project_role AS ENUM ('Frontend', 'Backend', 'Fullstack', 'QA', 'PMBA');

CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role public.project_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members readable by all" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "project_members insertable by all v1" ON public.project_members FOR INSERT WITH CHECK (true);
CREATE POLICY "project_members updatable by all v1" ON public.project_members FOR UPDATE USING (true);
CREATE POLICY "project_members deletable by all v1" ON public.project_members FOR DELETE USING (true);

-- ============================================================
-- STATUSES (global)
-- ============================================================
CREATE TYPE public.status_category AS ENUM ('backlog', 'active', 'done');

CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  position INT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  category public.status_category NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statuses readable by all" ON public.statuses FOR SELECT USING (true);
CREATE POLICY "statuses insertable by all v1" ON public.statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "statuses updatable by all v1" ON public.statuses FOR UPDATE USING (true);
CREATE POLICY "statuses deletable by all v1" ON public.statuses FOR DELETE USING (true);

CREATE TRIGGER statuses_updated_at
  BEFORE UPDATE ON public.statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default statuses
INSERT INTO public.statuses (name, position, color, category) VALUES
  ('To-Do',       1, '#94a3b8', 'backlog'),
  ('In Progress', 2, '#3b82f6', 'active'),
  ('In Review',   3, '#a855f7', 'active'),
  ('Done',        4, '#22c55e', 'done');

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TYPE public.ticket_type AS ENUM ('Standard', 'Bug', 'CR');

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ticket_number INT NOT NULL,
  formatted_id TEXT NOT NULL,
  title TEXT NOT NULL,
  ticket_type public.ticket_type NOT NULL DEFAULT 'Standard',
  status_id UUID REFERENCES public.statuses(id),
  est_frontend_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  est_backend_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_frontend_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_backend_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_overhead_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, ticket_number)
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets readable by all" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "tickets insertable by all v1" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "tickets updatable by all v1" ON public.tickets FOR UPDATE USING (true);
CREATE POLICY "tickets deletable by all v1" ON public.tickets FOR DELETE USING (true);

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tickets_project ON public.tickets(project_id);
CREATE INDEX idx_tickets_status ON public.tickets(status_id);

-- Auto-number + format ID + default status
CREATE OR REPLACE FUNCTION public.before_ticket_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INT;
  acr TEXT;
  default_status UUID;
BEGIN
  -- Lock & compute next ticket number for the project
  SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO next_num
    FROM public.tickets
    WHERE project_id = NEW.project_id;

  NEW.ticket_number := next_num;

  SELECT acronym INTO acr FROM public.projects WHERE id = NEW.project_id;
  NEW.formatted_id := acr || '-' || LPAD(next_num::TEXT, 3, '0');

  -- Default status = lowest-position backlog
  IF NEW.status_id IS NULL THEN
    SELECT id INTO default_status
      FROM public.statuses
      WHERE category = 'backlog'
      ORDER BY position ASC
      LIMIT 1;
    NEW.status_id := default_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_before_insert
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.before_ticket_insert();

-- ============================================================
-- TICKET ASSIGNEES
-- ============================================================
CREATE TYPE public.assignee_slot AS ENUM ('FE', 'BE');

CREATE TABLE public.ticket_assignees (
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  slot public.assignee_slot NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id, slot)
);

ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_assignees readable by all" ON public.ticket_assignees FOR SELECT USING (true);
CREATE POLICY "ticket_assignees insertable by all v1" ON public.ticket_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "ticket_assignees updatable by all v1" ON public.ticket_assignees FOR UPDATE USING (true);
CREATE POLICY "ticket_assignees deletable by all v1" ON public.ticket_assignees FOR DELETE USING (true);

-- Validate assignee role compatibility with slot
CREATE OR REPLACE FUNCTION public.validate_ticket_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  proj UUID;
  member_role public.project_role;
BEGIN
  SELECT project_id INTO proj FROM public.tickets WHERE id = NEW.ticket_id;
  IF proj IS NULL THEN
    RAISE EXCEPTION 'Ticket % not found', NEW.ticket_id;
  END IF;

  SELECT role INTO member_role
    FROM public.project_members
    WHERE project_id = proj AND user_id = NEW.user_id;

  IF member_role IS NULL THEN
    RAISE EXCEPTION 'User must be a project member before being assigned to a ticket';
  END IF;

  IF NEW.slot = 'FE' AND member_role NOT IN ('Frontend', 'Fullstack') THEN
    RAISE EXCEPTION 'FE slot requires Frontend or Fullstack role (got %)', member_role;
  END IF;

  IF NEW.slot = 'BE' AND member_role NOT IN ('Backend', 'Fullstack') THEN
    RAISE EXCEPTION 'BE slot requires Backend or Fullstack role (got %)', member_role;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ticket_assignees_validate
  BEFORE INSERT OR UPDATE ON public.ticket_assignees
  FOR EACH ROW EXECUTE FUNCTION public.validate_ticket_assignee();

-- ============================================================
-- TIME LOGS
-- ============================================================
CREATE TYPE public.log_discipline AS ENUM ('FE', 'BE', 'Overhead');
CREATE TYPE public.log_source AS ENUM ('timer', 'manual');

CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  discipline public.log_discipline NOT NULL,
  hours NUMERIC(10,2) NOT NULL CHECK (hours > 0),
  note TEXT,
  source public.log_source NOT NULL DEFAULT 'manual',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_logs readable by all" ON public.time_logs FOR SELECT USING (true);
CREATE POLICY "time_logs insertable by all v1" ON public.time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "time_logs updatable by all v1" ON public.time_logs FOR UPDATE USING (true);
CREATE POLICY "time_logs deletable by all v1" ON public.time_logs FOR DELETE USING (true);

CREATE INDEX idx_time_logs_ticket ON public.time_logs(ticket_id);
CREATE INDEX idx_time_logs_user ON public.time_logs(user_id);

-- Roll time_logs into ticket actual hours columns
CREATE OR REPLACE FUNCTION public.apply_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tickets SET
      actual_frontend_hours = actual_frontend_hours + CASE WHEN NEW.discipline = 'FE' THEN NEW.hours ELSE 0 END,
      actual_backend_hours  = actual_backend_hours  + CASE WHEN NEW.discipline = 'BE' THEN NEW.hours ELSE 0 END,
      actual_overhead_hours = actual_overhead_hours + CASE WHEN NEW.discipline = 'Overhead' THEN NEW.hours ELSE 0 END
    WHERE id = NEW.ticket_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tickets SET
      actual_frontend_hours = GREATEST(0, actual_frontend_hours - CASE WHEN OLD.discipline = 'FE' THEN OLD.hours ELSE 0 END),
      actual_backend_hours  = GREATEST(0, actual_backend_hours  - CASE WHEN OLD.discipline = 'BE' THEN OLD.hours ELSE 0 END),
      actual_overhead_hours = GREATEST(0, actual_overhead_hours - CASE WHEN OLD.discipline = 'Overhead' THEN OLD.hours ELSE 0 END)
    WHERE id = OLD.ticket_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER time_logs_apply
  AFTER INSERT OR DELETE ON public.time_logs
  FOR EACH ROW EXECUTE FUNCTION public.apply_time_log();

-- ============================================================
-- ACTIVE TIMERS (one per user)
-- ============================================================
CREATE TABLE public.active_timers (
  user_id UUID PRIMARY KEY REFERENCES public.team_members(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  discipline public.log_discipline NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_timers readable by all" ON public.active_timers FOR SELECT USING (true);
CREATE POLICY "active_timers insertable by all v1" ON public.active_timers FOR INSERT WITH CHECK (true);
CREATE POLICY "active_timers updatable by all v1" ON public.active_timers FOR UPDATE USING (true);
CREATE POLICY "active_timers deletable by all v1" ON public.active_timers FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_timers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;

-- ============================================================
-- SEED TEAM MEMBERS
-- ============================================================
INSERT INTO public.team_members (name, email, avatar_color) VALUES
  ('Maya Chen',     'maya@oldst.com',    '#f43f5e'),
  ('Jordan Reeves', 'jordan@oldst.com',  '#3b82f6'),
  ('Sam Patel',     'sam@oldst.com',     '#22c55e'),
  ('Alex Rivera',   'alex@oldst.com',    '#a855f7'),
  ('Riley Okafor',  'riley@oldst.com',   '#f59e0b'),
  ('Devon Park',    'devon@oldst.com',   '#06b6d4');