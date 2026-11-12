ALTER TABLE public.projects DROP CONSTRAINT projects_acronym_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_acronym_check CHECK (acronym ~ '^[A-Z0-9]{3,5}$');