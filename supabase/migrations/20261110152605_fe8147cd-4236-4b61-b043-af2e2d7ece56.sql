CREATE OR REPLACE FUNCTION public.feedback_zero_estimates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_type = 'Feedback' THEN
    NEW.original_fe_estimate := COALESCE(NEW.original_fe_estimate, 0);
    NEW.current_fe_estimate  := COALESCE(NEW.current_fe_estimate, NEW.original_fe_estimate, 0);
    NEW.original_be_estimate := COALESCE(NEW.original_be_estimate, 0);
    NEW.current_be_estimate  := COALESCE(NEW.current_be_estimate, NEW.original_be_estimate, 0);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS feedback_zero_estimates_trg ON public.tickets;
CREATE TRIGGER feedback_zero_estimates_trg BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.feedback_zero_estimates();