ALTER TABLE public.ticket_estimate_changes ADD COLUMN IF NOT EXISTS notified_at timestamptz;

DROP TRIGGER IF EXISTS slack_notify_on_estimate_change ON public.ticket_estimate_changes;

CREATE OR REPLACE FUNCTION public.notify_pending_estimate_revisions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _g record;
BEGIN
  FOR _g IN
    SELECT t.project_id, c.user_id, array_agg(c.id ORDER BY c.created_at) AS ids
    FROM public.ticket_estimate_changes c
    JOIN public.tickets t ON t.id = c.ticket_id
    WHERE c.status = 'pending' AND c.notified_at IS NULL
      AND c.created_at > now() - interval '1 day'
    GROUP BY t.project_id, c.user_id
  LOOP
    UPDATE public.ticket_estimate_changes SET notified_at = now() WHERE id = ANY(_g.ids);
    PERFORM public.enqueue_slack_notify(jsonb_build_object(
      'event', 'estimate_revisions_batch',
      'project_id', _g.project_id,
      'user_id', _g.user_id,
      'change_ids', to_jsonb(_g.ids)
    ));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_pending_estimate_revisions() FROM PUBLIC, anon, authenticated;