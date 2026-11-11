DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.list_project_tickets(uuid,jsonb,text,text,text,integer,integer)'::regprocedure);
  old_text text;
  new_text text;
BEGIN
  old_text := '''acceptance_criteria'', p.acceptance_criteria,';
  IF strpos(definition, old_text) = 0 THEN RAISE EXCEPTION 'Acceptance criteria replacement did not match'; END IF;
  definition := replace(definition, old_text, '');
  old_text := 'jsonb_build_object(''id'', pt.id, ''formatted_id'', pt.formatted_id, ''title'', pt.title)';
  new_text := 'jsonb_build_object(''id'', pt.id, ''formatted_id'', pt.formatted_id)';
  IF strpos(definition, old_text) = 0 THEN RAISE EXCEPTION 'Parent replacement did not match'; END IF;
  definition := replace(definition, old_text, new_text);
  old_text := 'jsonb_build_object(''id'', tm.id, ''name'', tm.name, ''email'', tm.email, ''avatar_color'', tm.avatar_color, ''role'', tm.role)';
  new_text := 'jsonb_build_object(''id'', tm.id, ''name'', tm.name, ''avatar_color'', tm.avatar_color)';
  IF strpos(definition, old_text) = 0 THEN RAISE EXCEPTION 'Member replacement did not match'; END IF;
  definition := replace(definition, old_text, new_text);
  EXECUTE definition;
END;
$migration$;