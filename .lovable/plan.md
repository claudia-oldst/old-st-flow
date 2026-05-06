# Enable Realtime on all tables

The app already subscribes to `postgres_changes` channels in many hooks (`useProjectTickets`, `useProjectEpics`, `useEstimateChanges`, `useAllEstimateChanges`, `useStatuses`, `TimerSync`, etc.), but those subscriptions only fire when the tables are part of the `supabase_realtime` publication and have a suitable `REPLICA IDENTITY`. Right now most tables aren't, so updates don't propagate live — users have to refresh.

## What I'll do

Run a single migration that, for every app table:

1. Sets `REPLICA IDENTITY FULL` (so UPDATE/DELETE payloads include full old-row data — needed for filters like `project_id=eq.…` to match).
2. Adds the table to the `supabase_realtime` publication (idempotent — skip if already added).

### Tables included
- `projects`
- `project_members`
- `project_epics`
- `project_epic_summaries`
- `tickets`
- `ticket_assignees`
- `ticket_estimate_changes`
- `time_logs`
- `statuses`
- `status_derivation_rules`
- `team_members`
- `active_timers`
- `active_timer_tickets`

### Migration shape
```sql
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
-- guarded add to publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets';
  END IF;
END $$;
```
…repeated for each table above.

## No code changes needed
All relevant hooks already subscribe via `supabase.channel(...).on('postgres_changes', …)` and call their `load()` on events. Once the publication is in place, those subscriptions start firing and the UI will refresh live across:
- Board / Tickets list / Ticket detail
- Estimate change requests
- Client portal editor
- Project team & epics
- Active timers (TopBar timer)
- Admin status rules

## Out of scope
- No new subscriptions added (existing coverage is already comprehensive).
- No RLS changes.
