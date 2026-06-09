-- Add planned sprint pool columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS planned_sprint_fe_id uuid NULL REFERENCES public.sprints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_sprint_be_id uuid NULL REFERENCES public.sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_planned_sprint_fe ON public.tickets(planned_sprint_fe_id);
CREATE INDEX IF NOT EXISTS idx_tickets_planned_sprint_be ON public.tickets(planned_sprint_be_id);

-- Backfill: legacy pool rows (sprint_tickets with no assigned dev) become per-discipline planned sprints on the ticket.
-- Only set FE planned sprint when the ticket has FE hours; same for BE.
UPDATE public.tickets t
SET planned_sprint_fe_id = st.sprint_id
FROM public.sprint_tickets st
WHERE st.ticket_id = t.id
  AND st.assigned_user_id IS NULL
  AND COALESCE(t.current_fe_estimate, 0) > 0
  AND t.planned_sprint_fe_id IS NULL;

UPDATE public.tickets t
SET planned_sprint_be_id = st.sprint_id
FROM public.sprint_tickets st
WHERE st.ticket_id = t.id
  AND st.assigned_user_id IS NULL
  AND COALESCE(t.current_be_estimate, 0) > 0
  AND t.planned_sprint_be_id IS NULL;

-- Now remove the legacy unassigned pool rows; sprint_tickets going forward is per-dev commitments only.
DELETE FROM public.sprint_tickets WHERE assigned_user_id IS NULL;