CREATE OR REPLACE FUNCTION public.slack_notify_comment_mention_trg()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _id text;
  _old_ids text[] := ARRAY[]::text[];
  _seen text[] := ARRAY[]::text[];
  _parent_author uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(array_agg(m[1]), ARRAY[]::text[]) INTO _old_ids
      FROM regexp_matches(coalesce(OLD.body, ''), '\(mention:([0-9a-fA-F-]{36})\)', 'g') AS m;
  END IF;

  FOR _id IN SELECT m[1] FROM regexp_matches(coalesce(NEW.body, ''), '\(mention:([0-9a-fA-F-]{36})\)', 'g') AS m
  LOOP
    CONTINUE WHEN _id = ANY(_seen);
    _seen := _seen || _id;
    CONTINUE WHEN _id = ANY(_old_ids);
    CONTINUE WHEN _id::uuid = NEW.user_id;
    PERFORM public.enqueue_slack_notify(jsonb_build_object('event','comment_mention','comment_id',NEW.id,'user_id',_id));
  END LOOP;

  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO _parent_author FROM public.ticket_comments WHERE id = NEW.parent_id;
    FOR _id IN
      SELECT DISTINCT x FROM (
        SELECT _parent_author::text AS x
        UNION
        SELECT m[1] FROM public.ticket_comments c,
          regexp_matches(coalesce(c.body,''), '\(mention:([0-9a-fA-F-]{36})\)', 'g') AS m
        WHERE (c.id = NEW.parent_id OR c.parent_id = NEW.parent_id) AND c.id <> NEW.id
      ) s WHERE x IS NOT NULL
    LOOP
      CONTINUE WHEN _id = ANY(_seen);
      CONTINUE WHEN _id::uuid = NEW.user_id;
      _seen := _seen || _id;
      PERFORM public.enqueue_slack_notify(jsonb_build_object('event','comment_mention','comment_id',NEW.id,'user_id',_id,'thread_reply',true));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;