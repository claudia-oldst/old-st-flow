ALTER TABLE public.projects DROP COLUMN IF EXISTS userback_project_id;
DELETE FROM public.app_settings WHERE key = 'userback_webhook_url';