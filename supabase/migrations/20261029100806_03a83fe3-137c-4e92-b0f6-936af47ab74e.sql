DO $$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.list_project_tickets'::regproc);
  def := replace(def, '''acceptance_criteria'', p.acceptance_criteria,', '''acceptance_criteria'', p.acceptance_criteria,
            ''external_source'', p.external_source,');
  EXECUTE def;
END $$;