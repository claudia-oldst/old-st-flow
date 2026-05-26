-- 1. Add auth_user_id column
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_members_auth_user_id_idx ON public.team_members(auth_user_id);

-- 2. Backfill from existing auth.users by email
UPDATE public.team_members tm
   SET auth_user_id = u.id
  FROM auth.users u
 WHERE tm.auth_user_id IS NULL
   AND lower(tm.email) = lower(u.email);

-- 3. BEFORE INSERT/UPDATE trigger on team_members: link to existing auth user by email
CREATE OR REPLACE FUNCTION public.set_team_member_auth_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.auth_user_id
      FROM auth.users
     WHERE lower(email) = lower(NEW.email)
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_link_auth_user ON public.team_members;
CREATE TRIGGER team_members_link_auth_user
BEFORE INSERT OR UPDATE OF email, auth_user_id ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.set_team_member_auth_id();

-- 4. AFTER INSERT trigger on auth.users: link to existing team_member by email
CREATE OR REPLACE FUNCTION public.link_team_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
     SET auth_user_id = NEW.id
   WHERE auth_user_id IS NULL
     AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_team_member ON auth.users;
CREATE TRIGGER on_auth_user_created_link_team_member
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_team_member_on_signup();

-- 5. Resolve current_team_member_id() from auth.uid() instead of the email claim.
--    Falls back to NULL if not linked yet (the BEFORE INSERT trigger + signup
--    trigger together guarantee linkage for any legitimately-added team member).
CREATE OR REPLACE FUNCTION public.current_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.team_members
   WHERE auth_user_id = auth.uid()
   LIMIT 1
$$;
