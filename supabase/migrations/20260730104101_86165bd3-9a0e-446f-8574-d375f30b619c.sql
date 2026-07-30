ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS slack_user_id text;

CREATE TABLE public.project_notification_prefs (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  slack_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notification_prefs TO authenticated;
GRANT ALL ON public.project_notification_prefs TO service_role;

ALTER TABLE public.project_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view prefs for their projects"
ON public.project_notification_prefs FOR SELECT TO authenticated
USING (public.current_is_pmba() OR public.current_is_project_member(project_id));

CREATE POLICY "Own or PMBA can insert prefs"
ON public.project_notification_prefs FOR INSERT TO authenticated
WITH CHECK (public.current_is_pmba() OR user_id = public.current_team_member_id());

CREATE POLICY "Own or PMBA can update prefs"
ON public.project_notification_prefs FOR UPDATE TO authenticated
USING (public.current_is_pmba() OR user_id = public.current_team_member_id())
WITH CHECK (public.current_is_pmba() OR user_id = public.current_team_member_id());

CREATE POLICY "Own or PMBA can delete prefs"
ON public.project_notification_prefs FOR DELETE TO authenticated
USING (public.current_is_pmba() OR user_id = public.current_team_member_id());

CREATE TRIGGER project_notification_prefs_set_updated_at
BEFORE UPDATE ON public.project_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fire-and-forget dispatch to the slack-notify edge function.
CREATE OR REPLACE FUNCTION public.enqueue_slack_notify(_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _url text;
  _secret text;
  _anon text;
BEGIN
  SELECT value INTO _url    FROM public.app_settings WHERE key = 'slack_notify_url';
  SELECT value INTO _secret FROM public.app_settings WHERE key = 'slack_notify_secret';
  SELECT value INTO _anon   FROM public.app_settings WHERE key = 'supabase_anon_key';
  IF _url IS NULL OR _secret IS NULL OR _anon IS NULL OR _payload IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon,
      'apikey', _anon,
      'x-notify-secret', _secret
    ),
    body := _payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.slack_notify_assignment_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.enqueue_slack_notify(jsonb_build_object(
    'event', 'ticket_assigned',
    'ticket_id', NEW.ticket_id,
    'user_id', NEW.user_id,
    'slot', NEW.slot
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER slack_notify_on_assignment
AFTER INSERT ON public.ticket_assignees
FOR EACH ROW EXECUTE FUNCTION public.slack_notify_assignment_trg();

CREATE OR REPLACE FUNCTION public.slack_notify_estimate_change_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;
  PERFORM public.enqueue_slack_notify(jsonb_build_object(
    'event', 'estimate_revision_requested',
    'change_id', NEW.id
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER slack_notify_on_estimate_change
AFTER INSERT ON public.ticket_estimate_changes
FOR EACH ROW EXECUTE FUNCTION public.slack_notify_estimate_change_trg();