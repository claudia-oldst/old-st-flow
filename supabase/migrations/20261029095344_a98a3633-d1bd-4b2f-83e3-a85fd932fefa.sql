ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'Feedback';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS external_source text, ADD COLUMN IF NOT EXISTS external_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_external_ref_uniq ON public.tickets (external_source, external_ref) WHERE external_ref IS NOT NULL;
INSERT INTO public.team_members (id, name, email, avatar_color, role)
VALUES ('00000000-0000-0000-0000-0000000000b2'::uuid, 'Thalamus', 'thalamus@old.st', '#FFCD71', 'QA')
ON CONFLICT (id) DO NOTHING;