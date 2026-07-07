UPDATE public.status_derivation_rules
SET status_id = public.first_status_in_category('backlog')
WHERE status_id = (SELECT id FROM public.statuses WHERE name = 'TO DO' LIMIT 1)
  AND status_id IS DISTINCT FROM public.first_status_in_category('backlog');

SELECT public.reapply_status_rules();