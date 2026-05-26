
-- pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- App settings (URL + sync secret). Only PMBA can read/write; trigger function bypasses via SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings: pmba all" ON public.app_settings;
CREATE POLICY "app_settings: pmba all"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.current_is_pmba())
WITH CHECK (public.current_is_pmba());

-- Seed the edge function URL (idempotent). The github_sync_secret value is added later by the user.
INSERT INTO public.app_settings (key, value)
VALUES ('github_sync_url', 'https://vkelhdyulmdhdgerzunu.supabase.co/functions/v1/github-sync-ticket')
ON CONFLICT (key) DO NOTHING;

-- Enqueue function: fires pg_net POST to edge function. No-op if URL or secret missing.
CREATE OR REPLACE FUNCTION public.enqueue_github_sync(_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT value INTO _url FROM public.app_settings WHERE key = 'github_sync_url';
  SELECT value INTO _secret FROM public.app_settings WHERE key = 'github_sync_secret';
  IF _url IS NULL OR _secret IS NULL OR _ticket_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', _secret
    ),
    body := jsonb_build_object('ticket_id', _ticket_id)
  );
END;
$$;

-- Ticket trigger: fire when GitHub-relevant fields change (or on insert).
CREATE OR REPLACE FUNCTION public.tickets_github_sync_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_github_sync(NEW.id);
    RETURN NEW;
  END IF;

  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.acceptance_criteria IS DISTINCT FROM OLD.acceptance_criteria)
     OR (NEW.status_id IS DISTINCT FROM OLD.status_id)
     OR (NEW.fe_status IS DISTINCT FROM OLD.fe_status)
     OR (NEW.be_status IS DISTINCT FROM OLD.be_status)
     OR (NEW.epic_id IS DISTINCT FROM OLD.epic_id)
     OR (NEW.ticket_type IS DISTINCT FROM OLD.ticket_type)
     OR (NEW.current_fe_estimate IS DISTINCT FROM OLD.current_fe_estimate)
     OR (NEW.current_be_estimate IS DISTINCT FROM OLD.current_be_estimate)
     OR (NEW.current_project_estimate IS DISTINCT FROM OLD.current_project_estimate)
     OR (NEW.version IS DISTINCT FROM OLD.version)
     OR (NEW.parent_ticket_id IS DISTINCT FROM OLD.parent_ticket_id)
  THEN
    PERFORM public.enqueue_github_sync(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_github_sync ON public.tickets;
CREATE TRIGGER tickets_github_sync
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.tickets_github_sync_trg();

-- Assignee trigger: any change to ticket_assignees re-syncs the parent ticket.
CREATE OR REPLACE FUNCTION public.assignees_github_sync_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_github_sync(COALESCE(NEW.ticket_id, OLD.ticket_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ticket_assignees_github_sync ON public.ticket_assignees;
CREATE TRIGGER ticket_assignees_github_sync
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_assignees
FOR EACH ROW
EXECUTE FUNCTION public.assignees_github_sync_trg();
