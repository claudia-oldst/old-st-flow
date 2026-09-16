CREATE OR REPLACE FUNCTION public.notify_closing_window_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
BEGIN
  FOR _p IN
    SELECT id
    FROM public.projects
    WHERE lifecycle_status = 'Bug-Fixing'
      AND is_archived = false
      AND closing_window_date = (current_date + 7)
  LOOP
    PERFORM public.enqueue_slack_notify(jsonb_build_object(
      'event', 'closing_window_reminder',
      'project_id', _p.id
    ));
  END LOOP;
END;
$$;