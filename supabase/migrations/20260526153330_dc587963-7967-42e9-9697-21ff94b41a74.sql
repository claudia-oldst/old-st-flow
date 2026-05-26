
INSERT INTO public.app_settings (key, value)
VALUES ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZWxoZHl1bG1kaGRnZXJ6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzIxMTcsImV4cCI6MjA5MjYwODExN30.hDh-GUqgexJVkb5Zqcl6t-OSRNMyQ4it7K6R9jAS9F8')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.enqueue_github_sync(_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text;
  _secret text;
  _anon text;
BEGIN
  SELECT value INTO _url    FROM public.app_settings WHERE key = 'github_sync_url';
  SELECT value INTO _secret FROM public.app_settings WHERE key = 'github_sync_secret';
  SELECT value INTO _anon   FROM public.app_settings WHERE key = 'supabase_anon_key';
  IF _url IS NULL OR _secret IS NULL OR _anon IS NULL OR _ticket_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon,
      'apikey', _anon,
      'x-sync-secret', _secret
    ),
    body := jsonb_build_object('ticket_id', _ticket_id)
  );
END;
$$;
