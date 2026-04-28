
-- 1. Rules table
CREATE TABLE public.status_derivation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL,
  fe_statuses public.discipline_status[] NOT NULL DEFAULT '{}',
  be_statuses public.discipline_status[] NOT NULL DEFAULT '{}',
  operator text NOT NULL CHECK (operator IN ('AND','OR')),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX status_derivation_rules_position_idx ON public.status_derivation_rules(position);

ALTER TABLE public.status_derivation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_derivation_rules readable by all"
  ON public.status_derivation_rules FOR SELECT USING (true);
CREATE POLICY "status_derivation_rules insertable by all v1"
  ON public.status_derivation_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "status_derivation_rules updatable by all v1"
  ON public.status_derivation_rules FOR UPDATE USING (true);
CREATE POLICY "status_derivation_rules deletable by all v1"
  ON public.status_derivation_rules FOR DELETE USING (true);

CREATE TRIGGER trg_status_derivation_rules_updated_at
  BEFORE UPDATE ON public.status_derivation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Seed defaults (mirrors prior hardcoded logic)
INSERT INTO public.status_derivation_rules (position, fe_statuses, be_statuses, operator, status_id)
VALUES
  (1, ARRAY['done']::public.discipline_status[],                ARRAY['done']::public.discipline_status[],                'AND', public.first_status_in_category('done')),
  (2, ARRAY['in_progress','done']::public.discipline_status[],  ARRAY['in_progress','done']::public.discipline_status[],  'OR',  public.first_status_in_category('active')),
  (3, ARRAY['todo']::public.discipline_status[],                ARRAY['todo']::public.discipline_status[],                'AND', public.first_status_in_category('backlog'));

-- 3. Rewrite derivation function: rule-driven + auto-clear override on FE/BE change
CREATE OR REPLACE FUNCTION public.derive_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  fe_match boolean;
  be_match boolean;
  matched boolean := false;
  fe_or_be_changed boolean;
BEGIN
  -- Proj-type tickets manage their own status manually.
  IF NEW.ticket_type = 'Proj' THEN
    RETURN NEW;
  END IF;

  -- Detect FE/BE change (treat INSERT as a change so override starts clean)
  IF TG_OP = 'INSERT' THEN
    fe_or_be_changed := true;
  ELSE
    fe_or_be_changed := (NEW.fe_status IS DISTINCT FROM OLD.fe_status)
                     OR (NEW.be_status IS DISTINCT FROM OLD.be_status);
  END IF;

  -- A FE/BE change auto-clears any prior manual override
  IF fe_or_be_changed AND NEW.project_status_override THEN
    NEW.project_status_override := false;
  END IF;

  -- If override still set (no FE/BE change this update), keep manual pick
  IF NEW.project_status_override THEN
    RETURN NEW;
  END IF;

  -- Walk rules in priority order; first match wins
  FOR r IN
    SELECT fe_statuses, be_statuses, operator, status_id
    FROM public.status_derivation_rules
    ORDER BY position ASC, created_at ASC
  LOOP
    fe_match := cardinality(r.fe_statuses) = 0 OR NEW.fe_status = ANY(r.fe_statuses);
    be_match := cardinality(r.be_statuses) = 0 OR NEW.be_status = ANY(r.be_statuses);

    IF (r.operator = 'AND' AND fe_match AND be_match)
       OR (r.operator = 'OR' AND (fe_match OR be_match)) THEN
      NEW.status_id := r.status_id;
      matched := true;
      EXIT;
    END IF;
  END LOOP;

  -- If no rule matched, leave status_id unchanged.
  RETURN NEW;
END;
$function$;

-- 4. Reapply rules across all eligible tickets (used after PMBA edits rules)
CREATE OR REPLACE FUNCTION public.reapply_status_rules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Touching updated_at fires the BEFORE UPDATE trigger that runs derive_project_status
  UPDATE public.tickets
  SET updated_at = now()
  WHERE ticket_type <> 'Proj'
    AND project_status_override = false;
END;
$function$;
