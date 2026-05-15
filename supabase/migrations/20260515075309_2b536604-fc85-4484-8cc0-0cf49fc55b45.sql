CREATE TABLE public.epic_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  epic_id bigint NOT NULL,
  discipline public.assignee_slot NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0),
  reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_epic_discounts_project ON public.epic_discounts(project_id);
CREATE INDEX idx_epic_discounts_epic ON public.epic_discounts(epic_id);

ALTER TABLE public.epic_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epic_discounts readable by all"
  ON public.epic_discounts FOR SELECT USING (true);

CREATE POLICY "epic_discounts insertable by pmba"
  ON public.epic_discounts FOR INSERT WITH CHECK (public.is_pmba(auth.uid()));

CREATE POLICY "epic_discounts updatable by pmba"
  ON public.epic_discounts FOR UPDATE USING (public.is_pmba(auth.uid()));

CREATE POLICY "epic_discounts deletable by pmba"
  ON public.epic_discounts FOR DELETE USING (public.is_pmba(auth.uid()));

CREATE TRIGGER trg_epic_discounts_updated_at
  BEFORE UPDATE ON public.epic_discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_epic_discount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  ep_proj uuid;
BEGIN
  SELECT project_id INTO ep_proj FROM public.project_epics WHERE id = NEW.epic_id;
  IF ep_proj IS NULL THEN
    RAISE EXCEPTION 'Epic % not found', NEW.epic_id;
  END IF;
  IF ep_proj <> NEW.project_id THEN
    RAISE EXCEPTION 'Epic must belong to the same project as the discount';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_epic_discount
  BEFORE INSERT OR UPDATE ON public.epic_discounts
  FOR EACH ROW EXECUTE FUNCTION public.validate_epic_discount();

ALTER PUBLICATION supabase_realtime ADD TABLE public.epic_discounts;