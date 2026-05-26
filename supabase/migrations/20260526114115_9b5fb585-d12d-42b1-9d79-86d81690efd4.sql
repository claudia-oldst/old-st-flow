ALTER TABLE public.team_members ADD COLUMN github_username text;

CREATE UNIQUE INDEX team_members_github_username_unique
  ON public.team_members (lower(github_username))
  WHERE github_username IS NOT NULL;

CREATE POLICY "team_members: self update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (id = current_team_member_id())
  WITH CHECK (id = current_team_member_id());