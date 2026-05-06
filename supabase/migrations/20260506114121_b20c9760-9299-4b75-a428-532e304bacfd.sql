
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'projects','project_members','project_epics','project_epic_summaries',
    'tickets','ticket_assignees','ticket_estimate_changes','time_logs',
    'statuses','status_derivation_rules','team_members',
    'active_timers','active_timer_tickets'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
