-- Restore EXECUTE on helper functions needed by RLS policies and client calls.
-- The previous blanket REVOKE broke sign-in (current_team_member_id is called from client/RLS).
GRANT EXECUTE ON FUNCTION public.current_team_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_is_pmba() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_can_access_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pmba(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.first_status_in_category(public.status_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_tickets(uuid, jsonb, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_portal_preview(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reapply_status_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_archive_payload(uuid) TO authenticated;