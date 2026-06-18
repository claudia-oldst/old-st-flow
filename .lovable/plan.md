# Sync ticket formatted_ids when project acronym changes

Add a Postgres trigger so that updating `projects.acronym` automatically rewrites `formatted_id` on every ticket in that project. Database-only change; no application code touched.

## Migration

New migration file in `supabase/migrations/` with the next timestamp prefix.

### 1. Trigger function

```sql
CREATE OR REPLACE FUNCTION public.sync_ticket_formatted_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.acronym IS DISTINCT FROM OLD.acronym THEN

    UPDATE public.tickets
    SET formatted_id = NEW.acronym || '-' || LPAD(ticket_number::text, 3, '0')
    WHERE project_id = NEW.id
      AND parent_ticket_id IS NULL;

    UPDATE public.tickets
    SET formatted_id = NEW.acronym || SUBSTRING(formatted_id FROM LENGTH(OLD.acronym) + 1)
    WHERE project_id = NEW.id
      AND parent_ticket_id IS NOT NULL;

  END IF;
  RETURN NEW;
END;
$$;
```

### 2. Trigger

```sql
DROP TRIGGER IF EXISTS trg_sync_formatted_ids ON public.projects;

CREATE TRIGGER trg_sync_formatted_ids
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_ticket_formatted_ids();
```

## Behavior

- First UPDATE: standard / CR / Proj tickets — rebuilt from new acronym + stored `ticket_number`.
- Second UPDATE: bug sub-tickets (format `PARENT:01`) — only the acronym prefix is swapped, suffix preserved.
- Body runs only when acronym actually changes (`IS DISTINCT FROM`).

## Constraints

- No app code changes.
- `before_ticket_insert` untouched — insert behavior unchanged.
- No backfill — existing rows already correct for current acronym.
- `SET search_path = public` matches existing trigger function convention.
- `DROP TRIGGER IF EXISTS` makes migration safely re-runnable.
