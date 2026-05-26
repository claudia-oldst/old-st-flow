
-- Revoke EXECUTE from anon/public on all SECURITY DEFINER functions, then re-grant
-- only the three intentionally-public client-portal functions.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant anon execute on intentionally-public client-portal RPCs
GRANT EXECUTE ON FUNCTION public.get_client_portal(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_change_requests(text) TO anon;
GRANT EXECUTE ON FUNCTION public.client_approve_cr(text, uuid) TO anon;
