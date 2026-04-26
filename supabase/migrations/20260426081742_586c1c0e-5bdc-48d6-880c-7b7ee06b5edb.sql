-- Insert new statuses (use temp names to avoid collisions if any exist)
WITH new_statuses AS (
  INSERT INTO public.statuses (name, position, color, category) VALUES
    ('TO DO', 1, '#64748b', 'backlog'),
    ('IN PROGRESS', 2, '#3b82f6', 'active'),
    ('FOR INTEGRATION', 3, '#8b5cf6', 'active'),
    ('FOR QA (ON STAGING)', 4, '#f59e0b', 'active'),
    ('IN QA', 5, '#eab308', 'active'),
    ('FOR DESIGN REVIEW', 6, '#ec4899', 'active'),
    ('IN DESIGN REVIEW', 7, '#d946ef', 'active'),
    ('DEV DONE (FOR DEPL.)', 8, '#10b981', 'done')
  RETURNING id, name, category
)
SELECT 1;

-- Remap any tickets currently pointing to OLD statuses to a new equivalent in same category
UPDATE public.tickets t
SET status_id = (
  SELECT id FROM public.statuses
  WHERE category = (SELECT category FROM public.statuses WHERE id = t.status_id)
    AND name IN ('TO DO','IN PROGRESS','FOR INTEGRATION','FOR QA (ON STAGING)','IN QA','FOR DESIGN REVIEW','IN DESIGN REVIEW','DEV DONE (FOR DEPL.)')
  ORDER BY position ASC
  LIMIT 1
)
WHERE status_id NOT IN (
  SELECT id FROM public.statuses
  WHERE name IN ('TO DO','IN PROGRESS','FOR INTEGRATION','FOR QA (ON STAGING)','IN QA','FOR DESIGN REVIEW','IN DESIGN REVIEW','DEV DONE (FOR DEPL.)')
);

-- Delete old statuses (anything not in the new set)
DELETE FROM public.statuses
WHERE name NOT IN ('TO DO','IN PROGRESS','FOR INTEGRATION','FOR QA (ON STAGING)','IN QA','FOR DESIGN REVIEW','IN DESIGN REVIEW','DEV DONE (FOR DEPL.)');
