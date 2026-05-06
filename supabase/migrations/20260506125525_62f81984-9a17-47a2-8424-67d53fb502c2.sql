ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS cr_approval text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cr_decided_by uuid,
  ADD COLUMN IF NOT EXISTS cr_decided_at timestamptz;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_cr_approval_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_cr_approval_check
  CHECK (cr_approval IN ('pending','approved','rejected'));