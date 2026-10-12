DO $$
DECLARE f regprocedure; d text;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('get_project_portal_preview','get_client_portal','get_client_portal_gantt','get_client_portal_change_requests','portal_billing_payload')
  LOOP
    d := pg_get_functiondef(f);
    d := replace(d, 'ORDER BY e.epic_name NULLS LAST', 'ORDER BY e.order_index, e.id');
    d := replace(d, 'ORDER BY e.epic_name)', 'ORDER BY e.order_index, e.id)');
    EXECUTE d;
  END LOOP;
END $$;