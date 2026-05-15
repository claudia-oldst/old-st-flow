DROP POLICY IF EXISTS "epic_discounts insertable by pmba" ON public.epic_discounts;
DROP POLICY IF EXISTS "epic_discounts updatable by pmba" ON public.epic_discounts;
DROP POLICY IF EXISTS "epic_discounts deletable by pmba" ON public.epic_discounts;

CREATE POLICY "epic_discounts insertable by all v1"
  ON public.epic_discounts FOR INSERT WITH CHECK (true);

CREATE POLICY "epic_discounts updatable by all v1"
  ON public.epic_discounts FOR UPDATE USING (true);

CREATE POLICY "epic_discounts deletable by all v1"
  ON public.epic_discounts FOR DELETE USING (true);