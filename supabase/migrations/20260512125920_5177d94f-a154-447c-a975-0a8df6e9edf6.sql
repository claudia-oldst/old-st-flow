UPDATE public.tickets
SET created_at = '2026-02-03T00:00:00+00:00'
WHERE formatted_id ~ '^COU-[0-9]+$'
  AND CAST(substring(formatted_id from 5) AS integer) BETWEEN 1 AND 436;