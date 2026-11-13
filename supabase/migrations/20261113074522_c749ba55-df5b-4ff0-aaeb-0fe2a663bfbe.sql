DROP POLICY IF EXISTS "time_logs: select scoped" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs: insert own" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs: update own or pmba" ON public.time_logs;
DROP POLICY IF EXISTS "time_logs: delete own or pmba" ON public.time_logs;
CREATE POLICY "time_logs: select scoped" ON public.time_logs FOR SELECT TO authenticated USING ((select public.current_is_pmba()) OR ticket_id IN (select t.id from public.tickets t join public.project_members pm on pm.project_id=t.project_id where pm.user_id=(select public.current_team_member_id())));
CREATE POLICY "time_logs: insert own" ON public.time_logs FOR INSERT TO authenticated WITH CHECK ((select public.current_is_pmba()) OR (user_id=(select public.current_team_member_id()) AND EXISTS (select 1 from public.ticket_assignees a where a.ticket_id=time_logs.ticket_id and a.user_id=time_logs.user_id)));
CREATE POLICY "time_logs: update own or pmba" ON public.time_logs FOR UPDATE TO authenticated USING ((select public.current_is_pmba()) OR user_id=(select public.current_team_member_id())) WITH CHECK ((select public.current_is_pmba()) OR user_id=(select public.current_team_member_id()));
CREATE POLICY "time_logs: delete own or pmba" ON public.time_logs FOR DELETE TO authenticated USING ((select public.current_is_pmba()) OR user_id=(select public.current_team_member_id()));