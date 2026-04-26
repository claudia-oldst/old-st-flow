
-- =========================================
-- STEP 1: Update fe_status / be_status
-- =========================================

-- both done
UPDATE public.tickets SET fe_status='done', be_status='done', project_status_override=true
WHERE formatted_id IN ('COU-285','COU-286','COU-287','COU-176','COU-177','COU-178','COU-179','COU-180','COU-235','COU-236','COU-237','COU-238','COU-239','COU-186','COU-187');

-- fe done, be todo
UPDATE public.tickets SET fe_status='done', be_status='todo', project_status_override=true
WHERE formatted_id IN (
  'COU-288','COU-293','COU-294','COU-295','COU-296',
  'COU-261','COU-262','COU-263','COU-265','COU-266','COU-268','COU-270',
  'COU-206','COU-205','COU-346',
  'COU-207','COU-208','COU-210','COU-209','COU-211',
  'COU-192','COU-194','COU-195','COU-196','COU-197','COU-198','COU-199','COU-200','COU-201',
  'COU-264','COU-290','COU-373','COU-374','COU-375','COU-376',
  'COU-075','COU-076','COU-077','COU-078','COU-079','COU-080','COU-081','COU-084',
  'COU-183','COU-184','COU-188','COU-189',
  'COU-212','COU-213','COU-214','COU-215','COU-216','COU-217','COU-218','COU-219','COU-220','COU-221','COU-222',
  'COU-114','COU-115','COU-118','COU-119',
  'COU-099','COU-106','COU-110','COU-111',
  'COU-340','COU-341','COU-342','COU-343','COU-344',
  'COU-252','COU-336','COU-090','COU-339'
);

-- fe todo, be done
UPDATE public.tickets SET fe_status='todo', be_status='done', project_status_override=true
WHERE formatted_id IN (
  'COU-302','COU-297','COU-352',
  'COU-054','COU-298','COU-299','COU-055','COU-056','COU-060','COU-126','COU-068','COU-074','COU-011','COU-061','COU-058',
  'COU-446','COU-181','COU-182',
  'COU-226','COU-227','COU-228','COU-229','COU-230','COU-231','COU-232','COU-233','COU-234','COU-240','COU-225'
);

-- both todo (explicitly)
UPDATE public.tickets SET fe_status='todo', be_status='todo', project_status_override=true
WHERE formatted_id IN (
  'COU-291','COU-292','COU-279','COU-278',
  'COU-004','COU-003','COU-005','COU-006','COU-010','COU-437','COU-300','COU-301','COU-282',
  'COU-069','COU-455','COU-057','COU-059','COU-067','COU-071','COU-438','COU-070'
);

-- =========================================
-- STEP 2: Merge assignees (insert if not exists)
-- =========================================

WITH
  ids AS (
    SELECT
      'RA'::text AS code, '9e953e08-aac2-431d-8abb-fa021e31ac35'::uuid AS user_id, 'FE'::public.assignee_slot AS slot UNION ALL
    SELECT 'ML', '21f94e0a-1bcb-4e3d-a16e-d25245fec92b'::uuid, 'FE' UNION ALL
    SELECT 'LT', '656c79e9-400a-49b6-90a7-0b1a7e26477a'::uuid, 'FE' UNION ALL
    SELECT 'GC', 'bf26f5ed-99c6-4831-aedf-acb31ab24cfc'::uuid, 'BE' UNION ALL
    SELECT 'IJ', 'db8ee2c4-29f2-45d7-a996-2405493f9e68'::uuid, 'BE' UNION ALL
    SELECT 'JT', 'b91a9e69-636e-462e-8bb2-a624f2ab0a01'::uuid, 'BE'
  ),
  pairs(formatted_id, code) AS (
    VALUES
      -- DEV DONE
      ('COU-285','IJ'),('COU-285','RA'),
      ('COU-286','IJ'),('COU-286','RA'),
      ('COU-287','IJ'),('COU-287','RA'),
      ('COU-288','IJ'),('COU-288','RA'),
      ('COU-291','IJ'),('COU-291','RA'),
      ('COU-292','IJ'),('COU-292','RA'),
      ('COU-293','IJ'),('COU-293','RA'),
      ('COU-294','IJ'),('COU-294','RA'),
      ('COU-295','IJ'),('COU-295','RA'),
      ('COU-296','IJ'),('COU-296','RA'),
      ('COU-261','GC'),('COU-261','RA'),
      ('COU-262','GC'),('COU-262','RA'),
      ('COU-263','GC'),('COU-263','RA'),
      ('COU-265','GC'),('COU-265','RA'),
      ('COU-266','GC'),('COU-266','RA'),
      ('COU-268','GC'),('COU-268','RA'),
      ('COU-270','GC'),('COU-270','RA'),
      ('COU-279','IJ'),('COU-279','RA'),('COU-279','ML'),
      ('COU-302','IJ'),('COU-302','RA'),('COU-302','GC'),
      ('COU-297','IJ'),('COU-297','RA'),('COU-297','GC'),
      ('COU-352','IJ'),('COU-352','RA'),('COU-352','ML'),
      ('COU-278','IJ'),('COU-278','RA'),('COU-278','ML'),
      -- FOR INTEGRATION
      ('COU-054','GC'),('COU-054','LT'),
      ('COU-298','IJ'),('COU-298','GC'),
      ('COU-299','IJ'),('COU-299','GC'),
      ('COU-055','GC'),('COU-055','LT'),
      ('COU-056','GC'),('COU-056','LT'),
      ('COU-060','GC'),('COU-060','LT'),
      ('COU-126','GC'),('COU-126','LT'),
      ('COU-068','GC'),('COU-068','LT'),
      ('COU-074','GC'),('COU-074','LT'),
      ('COU-011','GC'),('COU-011','LT'),
      ('COU-061','GC'),('COU-061','LT'),
      ('COU-058','GC'),('COU-058','LT'),
      -- IN PROGRESS
      ('COU-004','IJ'),('COU-004','GC'),('COU-004','JT'),
      ('COU-206','JT'),('COU-206','ML'),
      ('COU-205','JT'),('COU-205','ML'),
      ('COU-003','IJ'),('COU-003','GC'),('COU-003','JT'),
      ('COU-005','IJ'),('COU-005','GC'),
      ('COU-006','IJ'),('COU-006','GC'),
      ('COU-010','GC'),('COU-010','LT'),
      ('COU-176','JT'),('COU-176','ML'),('COU-176','RA'),
      ('COU-177','JT'),('COU-177','ML'),('COU-177','RA'),
      ('COU-178','JT'),('COU-178','ML'),('COU-178','RA'),
      ('COU-179','JT'),('COU-179','ML'),('COU-179','RA'),
      ('COU-180','JT'),('COU-180','ML'),('COU-180','RA'),
      ('COU-437','IJ'),('COU-437','GC'),
      ('COU-446','LT'),('COU-446','GC'),
      ('COU-300','IJ'),('COU-300','GC'),
      ('COU-301','IJ'),('COU-301','GC'),
      ('COU-282','IJ'),('COU-282','RA'),('COU-282','ML'),
      ('COU-346','IJ'),('COU-346','RA'),('COU-346','ML'),
      ('COU-181','JT'),('COU-181','ML'),('COU-181','RA'),
      ('COU-182','JT'),('COU-182','ML'),('COU-182','RA'),
      ('COU-069','GC'),('COU-069','LT'),
      ('COU-455','LT'),('COU-455','GC'),
      ('COU-057','GC'),('COU-057','LT'),
      ('COU-059','GC'),('COU-059','LT'),
      ('COU-067','GC'),('COU-067','LT'),
      ('COU-071','GC'),('COU-071','LT'),
      ('COU-438','LT'),('COU-438','GC'),
      ('COU-226','ML'),('COU-226','IJ'),
      ('COU-227','ML'),('COU-227','IJ'),
      ('COU-228','ML'),('COU-228','IJ'),
      ('COU-229','ML'),('COU-229','IJ'),
      ('COU-230','ML'),('COU-230','IJ'),
      ('COU-231','ML'),('COU-231','IJ'),
      ('COU-232','ML'),('COU-232','IJ'),
      ('COU-233','ML'),('COU-233','IJ'),
      ('COU-234','ML'),('COU-234','IJ'),
      ('COU-235','ML'),('COU-235','IJ'),('COU-235','RA'),
      ('COU-236','ML'),('COU-236','IJ'),('COU-236','RA'),
      ('COU-237','ML'),('COU-237','IJ'),('COU-237','RA'),
      ('COU-238','ML'),('COU-238','IJ'),('COU-238','RA'),
      ('COU-239','ML'),('COU-239','IJ'),('COU-239','RA'),
      ('COU-240','ML'),('COU-240','IJ'),
      ('COU-225','ML'),('COU-225','IJ'),
      ('COU-207','JT'),('COU-207','ML'),
      ('COU-208','JT'),('COU-208','ML'),
      ('COU-210','JT'),('COU-210','ML'),
      ('COU-209','JT'),('COU-209','ML'),
      ('COU-211','JT'),('COU-211','ML'),
      ('COU-192','JT'),('COU-192','ML'),
      ('COU-194','JT'),('COU-194','ML'),
      ('COU-195','JT'),('COU-195','ML'),
      ('COU-196','JT'),('COU-196','ML'),
      ('COU-197','JT'),('COU-197','ML'),
      ('COU-198','JT'),('COU-198','ML'),
      ('COU-199','JT'),('COU-199','ML'),
      ('COU-200','JT'),('COU-200','ML'),
      ('COU-201','JT'),('COU-201','ML'),
      ('COU-264','GC'),('COU-264','RA'),
      ('COU-290','IJ'),('COU-290','RA'),
      ('COU-373','IJ'),('COU-373','RA'),
      ('COU-374','IJ'),('COU-374','RA'),
      ('COU-375','IJ'),('COU-375','RA'),
      ('COU-376','IJ'),('COU-376','RA'),
      ('COU-075','RA'),
      ('COU-076','RA'),
      ('COU-077','RA'),
      ('COU-078','RA'),
      ('COU-079','RA'),
      ('COU-080','RA'),
      ('COU-081','IJ'),('COU-081','RA'),
      ('COU-084','RA'),
      ('COU-183','JT'),('COU-183','ML'),('COU-183','RA'),
      ('COU-184','JT'),('COU-184','ML'),('COU-184','RA'),
      ('COU-186','JT'),('COU-186','ML'),('COU-186','RA'),
      ('COU-187','JT'),('COU-187','ML'),('COU-187','RA'),
      ('COU-188','JT'),('COU-188','ML'),('COU-188','RA'),
      ('COU-189','JT'),('COU-189','ML'),('COU-189','RA'),
      ('COU-212','RA'),('COU-212','JT'),
      ('COU-213','RA'),('COU-213','JT'),
      ('COU-214','RA'),('COU-214','JT'),
      ('COU-215','RA'),('COU-215','JT'),
      ('COU-216','RA'),('COU-216','JT'),
      ('COU-217','RA'),('COU-217','JT'),
      ('COU-218','RA'),('COU-218','JT'),
      ('COU-219','RA'),('COU-219','JT'),
      ('COU-220','RA'),('COU-220','JT'),
      ('COU-221','RA'),('COU-221','JT'),
      ('COU-222','RA'),('COU-222','JT'),
      ('COU-114','GC'),('COU-114','RA'),
      ('COU-115','GC'),('COU-115','RA'),
      ('COU-118','GC'),('COU-118','RA'),
      ('COU-119','GC'),('COU-119','RA'),
      ('COU-099','IJ'),('COU-099','RA'),
      ('COU-106','RA'),
      ('COU-110','RA'),
      ('COU-111','RA'),
      ('COU-340','RA'),
      ('COU-341','RA'),
      ('COU-342','RA'),
      ('COU-343','RA'),
      ('COU-344','RA'),
      ('COU-252','IJ'),('COU-252','RA'),
      ('COU-336','RA'),('COU-336','GC'),
      ('COU-090','RA'),
      ('COU-339','RA'),
      ('COU-070','GC'),('COU-070','LT')
  )
INSERT INTO public.ticket_assignees (ticket_id, user_id, slot)
SELECT t.id, i.user_id, i.slot
FROM pairs p
JOIN ids i ON i.code = p.code
JOIN public.tickets t ON t.formatted_id = p.formatted_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_assignees ta
  WHERE ta.ticket_id = t.id AND ta.user_id = i.user_id AND ta.slot = i.slot
);
