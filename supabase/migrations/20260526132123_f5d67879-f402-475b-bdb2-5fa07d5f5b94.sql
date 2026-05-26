ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_repo_url text,
  ADD COLUMN IF NOT EXISTS github_owner text,
  ADD COLUMN IF NOT EXISTS github_repo text;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS github_issue_number int,
  ADD COLUMN IF NOT EXISTS github_issue_node_id text;