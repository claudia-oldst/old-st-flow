ALTER TYPE public.project_role ADD VALUE IF NOT EXISTS 'Operations';
ALTER TYPE public.project_role ADD VALUE IF NOT EXISTS 'Director';

CREATE OR REPLACE FUNCTION public.sync_team_member_role_to_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _r public.app_role;
BEGIN
  _r := CASE WHEN NEW.role::text IN ('PMBA','Operations','Director') THEN 'PMBA'::public.app_role ELSE 'member'::public.app_role END;
  DELETE FROM public.user_roles WHERE user_id = NEW.id AND role <> _r;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _r)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;