DROP TRIGGER IF EXISTS snap_estimates_on_dev_done_trg ON public.tickets;
CREATE TRIGGER snap_estimates_on_dev_done_trg
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.snap_estimates_on_dev_done();

DROP TRIGGER IF EXISTS trim_estimates_on_done ON public.tickets;
CREATE TRIGGER trim_estimates_on_done
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.trim_estimates_on_done();