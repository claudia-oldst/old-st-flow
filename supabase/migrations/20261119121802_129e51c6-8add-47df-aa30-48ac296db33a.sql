ALTER TABLE public.team_members ADD COLUMN is_active boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.guard_team_member_self_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.current_is_pmba() THEN RETURN NEW; END IF;
  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Only PMBAs can change email or account link';
  END IF;
  IF (NEW.role = 'PMBA') IS DISTINCT FROM (OLD.role = 'PMBA') THEN
    RAISE EXCEPTION 'Only PMBAs can grant or remove the PMBA role';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Only PMBAs can change whether a member is active';
  END IF;
  RETURN NEW;
END $function$;