DO $mig$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.list_project_tickets'::regproc);
  IF position('has_acceptance_criteria' in def) = 0 THEN
    def := replace(def, '''external_source'', p.external_source,',
      '''external_source'', p.external_source, ''has_acceptance_criteria'', coalesce(btrim(p.acceptance_criteria), '''') <> '''',');
    EXECUTE def;
  END IF;
END $mig$;