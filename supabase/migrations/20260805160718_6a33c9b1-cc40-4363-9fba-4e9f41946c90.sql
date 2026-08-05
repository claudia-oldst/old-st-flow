CREATE TABLE public.import_cou_logs (
  id bigserial PRIMARY KEY,
  ticket_type text,
  ticket_name text,
  epic text,
  discipline text,
  hours numeric,
  email text,
  assignee uuid,
  note text,
  log_date date,
  start_time time,
  created_date date,
  fe_est numeric,
  be_est numeric,
  pj_est numeric
);
GRANT ALL ON public.import_cou_logs TO service_role;
GRANT ALL ON SEQUENCE public.import_cou_logs_id_seq TO service_role;
ALTER TABLE public.import_cou_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PMBA can manage import staging" ON public.import_cou_logs FOR ALL TO authenticated USING (public.current_is_pmba()) WITH CHECK (public.current_is_pmba());