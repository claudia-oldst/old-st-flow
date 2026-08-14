CREATE TABLE public.project_favorites (
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

GRANT SELECT, INSERT, DELETE ON public.project_favorites TO authenticated;
GRANT ALL ON public.project_favorites TO service_role;

ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.project_favorites FOR SELECT TO authenticated
USING (user_id = public.current_team_member_id());

CREATE POLICY "Users can add their own favorites"
ON public.project_favorites FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_team_member_id());

CREATE POLICY "Users can remove their own favorites"
ON public.project_favorites FOR DELETE TO authenticated
USING (user_id = public.current_team_member_id());

CREATE INDEX idx_project_favorites_user ON public.project_favorites(user_id);