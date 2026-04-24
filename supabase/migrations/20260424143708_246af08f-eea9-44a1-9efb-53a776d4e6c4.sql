-- Add global role to team_members
ALTER TABLE public.team_members
  ADD COLUMN role public.project_role NOT NULL DEFAULT 'Fullstack';

-- Set Claudia Schwaeble as PMBA
UPDATE public.team_members SET role = 'PMBA' WHERE id = '5b97ae5d-d944-4f3d-9ce5-34104a655fc2';