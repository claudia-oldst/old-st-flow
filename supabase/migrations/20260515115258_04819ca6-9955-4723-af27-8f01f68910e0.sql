-- Drop default so new tickets don't auto-fill 'pending'
ALTER TABLE public.tickets ALTER COLUMN cr_approval DROP DEFAULT;

-- Null out cr_approval for all non-CR tickets
UPDATE public.tickets SET cr_approval = NULL WHERE ticket_type <> 'CR';

-- Ensure CR tickets without a value default to 'pending'
UPDATE public.tickets SET cr_approval = 'pending' WHERE ticket_type = 'CR' AND cr_approval IS NULL;

-- Enforce invariant: CR tickets must have a status, non-CR must not
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_cr_approval_consistency;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_cr_approval_consistency
  CHECK (
    (ticket_type = 'CR' AND cr_approval IN ('pending','approved','rejected'))
    OR (ticket_type <> 'CR' AND cr_approval IS NULL)
  );

-- Trigger to auto-manage cr_approval based on ticket_type
CREATE OR REPLACE FUNCTION public.sync_cr_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ticket_type = 'CR' THEN
    IF NEW.cr_approval IS NULL THEN
      NEW.cr_approval := 'pending';
    END IF;
  ELSE
    NEW.cr_approval := NULL;
    NEW.cr_decided_at := NULL;
    NEW.cr_decided_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cr_approval_trigger ON public.tickets;
CREATE TRIGGER sync_cr_approval_trigger
  BEFORE INSERT OR UPDATE OF ticket_type, cr_approval ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.sync_cr_approval();