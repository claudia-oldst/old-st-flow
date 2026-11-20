CREATE OR REPLACE FUNCTION public.slack_notify_assignment_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('app.in_sprint_planning', true) = 'on' THEN
    RETURN NEW;
  END IF;
  PERFORM public.enqueue_slack_notify(jsonb_build_object(
    'event', 'ticket_assigned', 'ticket_id', NEW.ticket_id,
    'user_id', NEW.user_id, 'slot', NEW.slot));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sprint_bulk_assign(
  _sprint_id uuid, _user_id uuid, _slot assignee_slot, _ticket_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _new_assigned int := 0; _tid uuid; _n int;
BEGIN
  IF NOT public.current_is_pmba() THEN RAISE EXCEPTION 'Only PM/BAs can plan sprints'; END IF;
  IF _slot NOT IN ('FE','BE') THEN RAISE EXCEPTION 'Invalid discipline'; END IF;
  PERFORM set_config('app.in_sprint_planning', 'on', true);
  FOREACH _tid IN ARRAY _ticket_ids LOOP
    IF NOT EXISTS (SELECT 1 FROM sprint_tickets WHERE sprint_id=_sprint_id AND ticket_id=_tid
                   AND assigned_user_id=_user_id AND discipline=_slot::text) THEN
      INSERT INTO sprint_tickets(sprint_id, ticket_id, assigned_user_id, discipline)
      VALUES (_sprint_id, _tid, _user_id, _slot::text);
    END IF;
    INSERT INTO ticket_assignees(ticket_id, user_id, slot) VALUES (_tid, _user_id, _slot)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _n = ROW_COUNT;
    _new_assigned := _new_assigned + _n;
  END LOOP;
  PERFORM set_config('app.in_sprint_planning', 'off', true);
  IF _new_assigned > 0 THEN
    PERFORM public.enqueue_slack_notify(jsonb_build_object(
      'event', 'sprint_bulk_assigned', 'sprint_id', _sprint_id,
      'user_id', _user_id, 'slot', _slot, 'count', _new_assigned));
  END IF;
  RETURN _new_assigned;
END;
$$;
REVOKE ALL ON FUNCTION public.sprint_bulk_assign(uuid, uuid, assignee_slot, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sprint_bulk_assign(uuid, uuid, assignee_slot, uuid[]) TO authenticated;