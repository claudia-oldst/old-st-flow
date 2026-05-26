-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON public.tickets (project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON public.tickets (status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_epic_id ON public.tickets (epic_id);
CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON public.tickets (parent_ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket_id ON public.ticket_assignees (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user_id ON public.ticket_assignees (user_id);

CREATE INDEX IF NOT EXISTS idx_time_logs_ticket_id ON public.time_logs (ticket_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON public.project_members (project_id, user_id);

-- Realtime
ALTER TABLE public.ticket_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.time_logs REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_estimate_changes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ticket_assignees') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_assignees';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='time_logs') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ticket_estimate_changes') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_estimate_changes';
  END IF;
END$$;