SELECT set_config('app.in_sprint_planning', 'on', true);

DELETE FROM public.sprint_tickets st
USING (
  SELECT id, row_number() OVER (PARTITION BY sprint_id, ticket_id, discipline ORDER BY created_at, id) rn
  FROM public.sprint_tickets
) d
WHERE st.id = d.id AND d.rn > 1;

DROP INDEX IF EXISTS public.sprint_tickets_sprint_ticket_user_disc_uniq;
DROP INDEX IF EXISTS public.sprint_tickets_sprint_ticket_user_uniq;

ALTER TABLE public.sprint_tickets
  ADD COLUMN IF NOT EXISTS unplanned boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS sprint_tickets_sprint_ticket_disc_uniq
  ON public.sprint_tickets (sprint_id, ticket_id, discipline);