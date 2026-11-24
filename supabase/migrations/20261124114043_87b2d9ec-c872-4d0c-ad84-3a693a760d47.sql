CREATE OR REPLACE FUNCTION public.notify_closing_window_due()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  FOR _p IN SELECT id, closing_window_date FROM public.projects
    WHERE lifecycle_status = 'Bug-Fixing' AND is_archived = false
      AND closing_window_date IN (current_date + 7, current_date)
  LOOP
    PERFORM public.enqueue_slack_notify(jsonb_build_object(
      'event', CASE WHEN _p.closing_window_date = current_date THEN 'closing_window_today' ELSE 'closing_window_reminder' END,
      'project_id', _p.id));
  END LOOP;
END; $$;