-- 1. Add new estimate columns
ALTER TABLE public.tickets
  ADD COLUMN original_fe_estimate numeric NOT NULL DEFAULT 0,
  ADD COLUMN original_be_estimate numeric NOT NULL DEFAULT 0,
  ADD COLUMN current_fe_estimate  numeric NOT NULL DEFAULT 0,
  ADD COLUMN current_be_estimate  numeric NOT NULL DEFAULT 0;

-- 2. Backfill from legacy columns
UPDATE public.tickets
   SET original_fe_estimate = est_frontend_hours,
       current_fe_estimate  = est_frontend_hours,
       original_be_estimate = est_backend_hours,
       current_be_estimate  = est_backend_hours;

-- 3. Drop legacy columns
ALTER TABLE public.tickets
  DROP COLUMN est_frontend_hours,
  DROP COLUMN est_backend_hours;

-- 4. Audit log table
CREATE TABLE public.ticket_estimate_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  discipline public.assignee_slot NOT NULL,
  previous_hours numeric NOT NULL,
  new_hours numeric NOT NULL,
  delta numeric GENERATED ALWAYS AS (new_hours - previous_hours) STORED,
  reason text,
  status text NOT NULL DEFAULT 'approved',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tec_ticket ON public.ticket_estimate_changes(ticket_id);
CREATE INDEX idx_tec_created_at ON public.ticket_estimate_changes(created_at);

ALTER TABLE public.ticket_estimate_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_estimate_changes readable by all"
  ON public.ticket_estimate_changes FOR SELECT
  USING (true);

CREATE POLICY "ticket_estimate_changes insertable by all v1"
  ON public.ticket_estimate_changes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ticket_estimate_changes updatable by all v1"
  ON public.ticket_estimate_changes FOR UPDATE
  USING (true);

CREATE POLICY "ticket_estimate_changes deletable by all v1"
  ON public.ticket_estimate_changes FOR DELETE
  USING (true);

-- 5. Seed baseline entries for existing tickets (FE and BE) so trend chart has a starting point.
-- user_id falls back to a team_member id if available, otherwise a zero uuid placeholder.
INSERT INTO public.ticket_estimate_changes (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, created_at)
SELECT t.id,
       COALESCE(
         (SELECT user_id FROM public.ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.slot = 'FE' LIMIT 1),
         (SELECT id FROM public.team_members LIMIT 1),
         '00000000-0000-0000-0000-000000000000'::uuid
       ),
       'FE'::public.assignee_slot,
       0,
       t.original_fe_estimate,
       'Initial estimate',
       'approved',
       t.created_at
FROM public.tickets t
WHERE t.original_fe_estimate > 0;

INSERT INTO public.ticket_estimate_changes (ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, created_at)
SELECT t.id,
       COALESCE(
         (SELECT user_id FROM public.ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.slot = 'BE' LIMIT 1),
         (SELECT id FROM public.team_members LIMIT 1),
         '00000000-0000-0000-0000-000000000000'::uuid
       ),
       'BE'::public.assignee_slot,
       0,
       t.original_be_estimate,
       'Initial estimate',
       'approved',
       t.created_at
FROM public.tickets t
WHERE t.original_be_estimate > 0;