GRANT EXECUTE ON FUNCTION public.purge_project_children(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rehydrate_project(uuid, jsonb, jsonb) TO service_role;