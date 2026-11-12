ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION public.guard_team_member_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.current_is_pmba() THEN RETURN NEW; END IF;
  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Only PMBAs can change email or account link';
  END IF;
  IF (NEW.role = 'PMBA') IS DISTINCT FROM (OLD.role = 'PMBA') THEN
    RAISE EXCEPTION 'Only PMBAs can grant or remove the PMBA role';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_team_member_self_update ON public.team_members;
CREATE TRIGGER guard_team_member_self_update BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.guard_team_member_self_update();

CREATE POLICY "avatars: signed-in read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
CREATE POLICY "avatars: own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_team_member_id()::text);
CREATE POLICY "avatars: own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_team_member_id()::text);
CREATE POLICY "avatars: own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_team_member_id()::text);