
-- Derive FE/BE discipline status for COU tickets from imported time logs.
-- Any FE log -> fe_status='in_progress'; any BE log -> be_status='in_progress'.
-- Project-discipline logs don't affect FE/BE. Existing triggers will recompute project status.
WITH agg AS (
  SELECT ticket_id,
         bool_or(discipline='FE') AS has_fe,
         bool_or(discipline='BE') AS has_be
  FROM time_logs
  WHERE ticket_id IN (SELECT id FROM tickets WHERE project_id='b95f5c11-16a9-4b2f-a410-00ba79f88f15')
  GROUP BY ticket_id
)
UPDATE tickets t
SET fe_status = CASE WHEN agg.has_fe THEN 'in_progress'::discipline_status ELSE t.fe_status END,
    be_status = CASE WHEN agg.has_be THEN 'in_progress'::discipline_status ELSE t.be_status END
FROM agg
WHERE t.id = agg.ticket_id
  AND (
    (agg.has_fe AND t.fe_status='todo') OR
    (agg.has_be AND t.be_status='todo')
  );
