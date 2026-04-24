CREATE POLICY "project_epics readable by all" ON public.project_epics
  FOR SELECT USING (true);
CREATE POLICY "project_epics insertable by all v1" ON public.project_epics
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_epics updatable by all v1" ON public.project_epics
  FOR UPDATE USING (true);
CREATE POLICY "project_epics deletable by all v1" ON public.project_epics
  FOR DELETE USING (true);