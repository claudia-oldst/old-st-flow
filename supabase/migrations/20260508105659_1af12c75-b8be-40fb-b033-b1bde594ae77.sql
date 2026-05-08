REVOKE EXECUTE ON FUNCTION public.purge_project_children(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_project_archive_payload(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rehydrate_project(uuid, jsonb, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_pmba(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reapply_status_rules() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.first_status_in_category(status_category) FROM anon, authenticated, public;