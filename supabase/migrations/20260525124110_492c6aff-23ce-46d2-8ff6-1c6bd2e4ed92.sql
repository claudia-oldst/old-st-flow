REVOKE EXECUTE ON FUNCTION public.current_team_member_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_is_pmba() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_is_project_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_can_access_ticket(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.current_team_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_is_pmba() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_can_access_ticket(uuid) TO authenticated;
