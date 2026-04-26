CREATE TABLE public.active_timer_tickets (
  user_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ticket_id)
);

ALTER TABLE public.active_timer_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_timer_tickets readable by all"
ON public.active_timer_tickets FOR SELECT
USING (true);

CREATE POLICY "active_timer_tickets insertable by all v1"
ON public.active_timer_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "active_timer_tickets updatable by all v1"
ON public.active_timer_tickets FOR UPDATE
USING (true);

CREATE POLICY "active_timer_tickets deletable by all v1"
ON public.active_timer_tickets FOR DELETE
USING (true);

CREATE INDEX idx_active_timer_tickets_user ON public.active_timer_tickets(user_id);
CREATE INDEX idx_active_timer_tickets_ticket ON public.active_timer_tickets(ticket_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_timer_tickets;
ALTER TABLE public.active_timer_tickets REPLICA IDENTITY FULL;