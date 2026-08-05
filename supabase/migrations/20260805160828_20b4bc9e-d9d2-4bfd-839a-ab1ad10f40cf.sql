GRANT INSERT, SELECT ON public.import_cou_logs TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.import_cou_logs_id_seq TO anon;
CREATE POLICY "temp import load" ON public.import_cou_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "temp import read" ON public.import_cou_logs FOR SELECT TO anon USING (true);