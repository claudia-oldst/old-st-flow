
ALTER TABLE public.sprint_tickets ADD COLUMN discipline text;

-- Drop old uniqueness first so we can insert BE duplicates for fullstack rows
DROP INDEX IF EXISTS public.sprint_tickets_sprint_ticket_user_uniq;

UPDATE public.sprint_tickets st
SET discipline = 'FE'
WHERE EXISTS (
  SELECT 1 FROM public.ticket_assignees ta
  WHERE ta.ticket_id = st.ticket_id
    AND ta.user_id = st.assigned_user_id
    AND ta.slot = 'FE'
);

INSERT INTO public.sprint_tickets (sprint_id, ticket_id, assigned_user_id, discipline)
SELECT st.sprint_id, st.ticket_id, st.assigned_user_id, 'BE'
FROM public.sprint_tickets st
WHERE st.discipline = 'FE'
  AND EXISTS (
    SELECT 1 FROM public.ticket_assignees ta
    WHERE ta.ticket_id = st.ticket_id
      AND ta.user_id = st.assigned_user_id
      AND ta.slot = 'BE'
  );

UPDATE public.sprint_tickets st
SET discipline = 'BE'
WHERE st.discipline IS NULL
  AND EXISTS (
    SELECT 1 FROM public.ticket_assignees ta
    WHERE ta.ticket_id = st.ticket_id
      AND ta.user_id = st.assigned_user_id
      AND ta.slot = 'BE'
  );

UPDATE public.sprint_tickets st
SET discipline = CASE pm.role
  WHEN 'Frontend' THEN 'FE'
  WHEN 'Backend' THEN 'BE'
  ELSE 'FE'
END
FROM public.sprints s, public.project_members pm
WHERE st.sprint_id = s.id
  AND pm.project_id = s.project_id
  AND pm.user_id = st.assigned_user_id
  AND st.discipline IS NULL;

UPDATE public.sprint_tickets SET discipline = 'FE' WHERE discipline IS NULL;

ALTER TABLE public.sprint_tickets
  ALTER COLUMN discipline SET NOT NULL,
  ADD CONSTRAINT sprint_tickets_discipline_check CHECK (discipline IN ('FE','BE'));

CREATE UNIQUE INDEX sprint_tickets_sprint_ticket_user_disc_uniq
  ON public.sprint_tickets (sprint_id, ticket_id, assigned_user_id, discipline)
  WHERE assigned_user_id IS NOT NULL;
