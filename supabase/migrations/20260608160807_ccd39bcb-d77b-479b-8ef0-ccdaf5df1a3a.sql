
-- sprints
CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_number int NOT NULL,
  name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sprint_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sprints" ON public.sprints
  FOR SELECT TO authenticated
  USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "PMBA insert sprints" ON public.sprints
  FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA update sprints" ON public.sprints
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba())
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA delete sprints" ON public.sprints
  FOR DELETE TO authenticated
  USING (public.current_is_pmba());

CREATE TRIGGER trg_sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sprint_capacities
CREATE TABLE public.sprint_capacities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  discipline public.assignee_slot NOT NULL,
  hours numeric NOT NULL DEFAULT 0 CHECK (hours >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, user_id, discipline)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_capacities TO authenticated;
GRANT ALL ON public.sprint_capacities TO service_role;
ALTER TABLE public.sprint_capacities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view capacities" ON public.sprint_capacities
  FOR SELECT TO authenticated
  USING (
    public.current_is_pmba()
    OR EXISTS (SELECT 1 FROM public.sprints s WHERE s.id = sprint_id AND public.current_is_project_member(s.project_id))
  );

CREATE POLICY "PMBA insert capacities" ON public.sprint_capacities
  FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA update capacities" ON public.sprint_capacities
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba())
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA delete capacities" ON public.sprint_capacities
  FOR DELETE TO authenticated
  USING (public.current_is_pmba());

CREATE TRIGGER trg_sprint_capacities_updated_at
  BEFORE UPDATE ON public.sprint_capacities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sprint_tickets
CREATE TABLE public.sprint_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, ticket_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_tickets TO authenticated;
GRANT ALL ON public.sprint_tickets TO service_role;
ALTER TABLE public.sprint_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sprint_tickets" ON public.sprint_tickets
  FOR SELECT TO authenticated
  USING (
    public.current_is_pmba()
    OR EXISTS (SELECT 1 FROM public.sprints s WHERE s.id = sprint_id AND public.current_is_project_member(s.project_id))
  );

CREATE POLICY "PMBA insert sprint_tickets" ON public.sprint_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA update sprint_tickets" ON public.sprint_tickets
  FOR UPDATE TO authenticated
  USING (public.current_is_pmba())
  WITH CHECK (public.current_is_pmba());

CREATE POLICY "PMBA delete sprint_tickets" ON public.sprint_tickets
  FOR DELETE TO authenticated
  USING (public.current_is_pmba());

CREATE TRIGGER trg_sprint_tickets_updated_at
  BEFORE UPDATE ON public.sprint_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Block Proj tickets from sprints
CREATE OR REPLACE FUNCTION public.block_proj_ticket_in_sprint()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t_type public.ticket_type;
BEGIN
  SELECT ticket_type INTO t_type FROM public.tickets WHERE id = NEW.ticket_id;
  IF t_type = 'Proj' THEN
    RAISE EXCEPTION 'Project-type tickets cannot be added to a sprint';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_proj_sprint_ticket
  BEFORE INSERT OR UPDATE ON public.sprint_tickets
  FOR EACH ROW EXECUTE FUNCTION public.block_proj_ticket_in_sprint();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_capacities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_tickets;
