ALTER TABLE public.project_epics ADD COLUMN order_index integer NOT NULL DEFAULT 0;

UPDATE public.project_epics e SET order_index = s.rn
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) - 1 AS rn FROM public.project_epics) s
WHERE s.id = e.id;

CREATE INDEX IF NOT EXISTS project_epics_project_order_idx ON public.project_epics (project_id, order_index);

CREATE OR REPLACE FUNCTION public.set_epic_order_index()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT COALESCE(MAX(order_index) + 1, 0) INTO NEW.order_index
  FROM public.project_epics WHERE project_id = NEW.project_id;
  RETURN NEW;
END $$;

CREATE TRIGGER project_epics_set_order_index
BEFORE INSERT ON public.project_epics
FOR EACH ROW EXECUTE FUNCTION public.set_epic_order_index();

CREATE OR REPLACE FUNCTION public.reorder_project_epics(_project_id uuid, _epic_ids bigint[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_is_pmba() THEN
    RAISE EXCEPTION 'Only PMBAs can reorder epics';
  END IF;
  UPDATE public.project_epics e SET order_index = o.pos - 1
  FROM unnest(_epic_ids) WITH ORDINALITY AS o(id, pos)
  WHERE e.id = o.id AND e.project_id = _project_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.reorder_project_epics(uuid, bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_project_epics(uuid, bigint[]) TO authenticated;