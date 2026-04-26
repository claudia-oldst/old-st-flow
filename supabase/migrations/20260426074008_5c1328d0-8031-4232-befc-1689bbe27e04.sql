
WITH latest AS (
  SELECT DISTINCT ON (ticket_id, discipline)
    ticket_id, discipline, new_hours
  FROM public.ticket_estimate_changes
  WHERE status = 'approved'
  ORDER BY ticket_id, discipline, created_at DESC, id DESC
)
UPDATE public.tickets t
SET
  current_fe_estimate = COALESCE(fe.new_hours, t.current_fe_estimate),
  current_be_estimate = COALESCE(be.new_hours, t.current_be_estimate),
  updated_at = now()
FROM (SELECT ticket_id, new_hours FROM latest WHERE discipline = 'FE') fe
FULL OUTER JOIN (SELECT ticket_id, new_hours FROM latest WHERE discipline = 'BE') be
  ON fe.ticket_id = be.ticket_id
WHERE t.id = COALESCE(fe.ticket_id, be.ticket_id);
