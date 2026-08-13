CREATE OR REPLACE FUNCTION public.slack_notify_comment_mention_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id text;
  _old_ids text[] := ARRAY[]::text[];
  _seen text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(array_agg(m[1]), ARRAY[]::text[])
      INTO _old_ids
      FROM regexp_matches(coalesce(OLD.body, ''), '\(mention:([0-9a-fA-F-]{36})\)', 'g') AS m;
  END IF;

  FOR _id IN
    SELECT m[1]
    FROM regexp_matches(coalesce(NEW.body, ''), '\(mention:([0-9a-fA-F-]{36})\)', 'g') AS m
  LOOP
    CONTINUE WHEN _id = ANY(_seen);
    _seen := _seen || _id;
    CONTINUE WHEN _id = ANY(_old_ids);
    CONTINUE WHEN _id::uuid = NEW.user_id;
    PERFORM public.enqueue_slack_notify(jsonb_build_object(
      'event', 'comment_mention',
      'comment_id', NEW.id,
      'user_id', _id
    ));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS slack_notify_on_comment_mention ON public.ticket_comments;

CREATE TRIGGER slack_notify_on_comment_mention
AFTER INSERT OR UPDATE OF body ON public.ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.slack_notify_comment_mention_trg();