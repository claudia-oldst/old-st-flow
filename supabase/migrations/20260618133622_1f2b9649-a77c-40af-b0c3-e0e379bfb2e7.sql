ALTER TABLE public.sprint_tickets
  DROP CONSTRAINT IF EXISTS sprint_tickets_sprint_id_ticket_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS sprint_tickets_sprint_ticket_user_uniq
  ON public.sprint_tickets (sprint_id, ticket_id, assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;