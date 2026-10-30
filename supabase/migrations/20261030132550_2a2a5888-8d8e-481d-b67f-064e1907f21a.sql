DO $mig$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.list_project_tickets(uuid,jsonb,text,text,text,integer,integer)'::regprocedure);
  def := replace(def,
    'AND (_types IS NULL OR cardinality(_types) = 0 OR t.ticket_type::text = ANY(_types))',
    'AND (_types IS NULL OR cardinality(_types) = 0 OR t.ticket_type::text = ANY(_types))
        AND (jsonb_typeof(_filters->''sources'') IS DISTINCT FROM ''array'' OR jsonb_array_length(_filters->''sources'') = 0 OR t.external_source = ANY(ARRAY(SELECT jsonb_array_elements_text(_filters->''sources''))))');
  IF position('_filters->''sources''' in def) = 0 THEN RAISE EXCEPTION 'patch target not found'; END IF;
  EXECUTE def;
END $mig$;