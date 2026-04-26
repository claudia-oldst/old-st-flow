-- 1) Extend enums (must be committed before being used in expressions)
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'Proj';
ALTER TYPE public.log_discipline ADD VALUE IF NOT EXISTS 'Project';
ALTER TYPE public.assignee_slot ADD VALUE IF NOT EXISTS 'Project';

-- 2) New estimate / actual columns on tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS original_project_estimate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_project_estimate  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_project_hours      numeric NOT NULL DEFAULT 0;
