DO $$
DECLARE
  fn text;
  d text;
  nd text;
  old_txt text := E'''summary_updated_at'', proj.client_summary_updated_at\n    ),';
  new_txt text := E'''summary_updated_at'', proj.client_summary_updated_at,\n      ''versions'', to_jsonb(vers)\n    ),';
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.get_client_portal(text)',
    'public.get_project_portal_preview(uuid, timestamptz, text[])'
  ] LOOP
    d := pg_get_functiondef(fn::regprocedure);
    nd := replace(d, old_txt, new_txt);
    IF nd = d THEN
      RAISE EXCEPTION 'anchor not found in %', fn;
    END IF;
    EXECUTE nd;
  END LOOP;
END $$;