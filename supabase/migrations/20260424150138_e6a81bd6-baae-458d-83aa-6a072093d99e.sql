-- Discipline status enum
DO $$ BEGIN
  CREATE TYPE public.discipline_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns on tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS fe_status public.discipline_status NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS be_status public.discipline_status NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS project_status_override boolean NOT NULL DEFAULT false;

-- Helper: pick the lowest-position status for a category
CREATE OR REPLACE FUNCTION public.first_status_in_category(_cat public.status_category)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.statuses WHERE category = _cat ORDER BY position ASC LIMIT 1;
$$;

-- Derive project status from fe/be statuses (only when not overridden)
CREATE OR REPLACE FUNCTION public.derive_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  derived uuid;
BEGIN
  IF NEW.project_status_override THEN
    RETURN NEW;
  END IF;

  IF NEW.fe_status = 'done' AND NEW.be_status = 'done' THEN
    derived := public.first_status_in_category('done');
  ELSIF NEW.fe_status = 'in_progress' OR NEW.be_status = 'in_progress'
        OR (NEW.fe_status = 'done' AND NEW.be_status <> 'done')
        OR (NEW.be_status = 'done' AND NEW.fe_status <> 'done') THEN
    derived := public.first_status_in_category('active');
  ELSE
    derived := public.first_status_in_category('backlog');
  END IF;

  IF derived IS NOT NULL THEN
    NEW.status_id := derived;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS derive_project_status_trg ON public.tickets;
CREATE TRIGGER derive_project_status_trg
BEFORE INSERT OR UPDATE OF fe_status, be_status, project_status_override ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.derive_project_status();

-- When status_id is changed directly (not via the derive trigger flow), flag override
CREATE OR REPLACE FUNCTION public.flag_project_status_override()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only flag when status_id was changed AND fe/be status weren't (i.e. manual change)
  IF NEW.status_id IS DISTINCT FROM OLD.status_id
     AND NEW.fe_status = OLD.fe_status
     AND NEW.be_status = OLD.be_status
     AND NEW.project_status_override = OLD.project_status_override THEN
    NEW.project_status_override := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flag_project_status_override_trg ON public.tickets;
CREATE TRIGGER flag_project_status_override_trg
BEFORE UPDATE OF status_id ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.flag_project_status_override();
