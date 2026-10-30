ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slack_channel_id text;
GRANT SELECT, UPDATE (slack_channel_id) ON public.projects TO authenticated;