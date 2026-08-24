ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS userback_project_id TEXT;

INSERT INTO public.app_settings (key, value)
VALUES ('userback_webhook_url', 'https://vkelhdyulmdhdgerzunu.supabase.co/functions/v1/userback-webhook')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.team_members (id, name, email, avatar_color, role)
VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, 'Userback', 'userback@old.st', '#F76C5E', 'QA')
ON CONFLICT (id) DO NOTHING;