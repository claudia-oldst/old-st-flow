CREATE OR REPLACE FUNCTION public.slack_notify_estimate_rejected_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.enqueue_slack_notify(jsonb_build_object('event','estimate_revision_rejected','change_id',NEW.id));
  RETURN NEW;
END; $$;
CREATE TRIGGER slack_notify_on_estimate_rejected
AFTER UPDATE OF status ON public.ticket_estimate_changes
FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status = 'rejected')
EXECUTE FUNCTION public.slack_notify_estimate_rejected_trg();