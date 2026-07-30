INSERT INTO public.app_settings (key, value)
VALUES ('app_base_url', 'https://oldst-pulse.lovable.app')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();