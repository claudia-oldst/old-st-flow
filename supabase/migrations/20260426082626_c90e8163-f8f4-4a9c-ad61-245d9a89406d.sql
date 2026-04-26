UPDATE public.tickets
SET status_id = (SELECT id FROM public.statuses WHERE name = 'DEV DONE (FOR DEPL.)' LIMIT 1),
    project_status_override = true
WHERE formatted_id IN (
  'COU-008','COU-009','COU-045','COU-127',
  'COU-272','COU-273','COU-274','COU-275','COU-276','COU-277',
  'COU-280','COU-281','COU-283','COU-284','COU-285','COU-286',
  'COU-345','COU-347','COU-348','COU-349','COU-350','COU-351'
);