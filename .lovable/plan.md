## Goal
Capture each team member's GitHub username on first login, verified against GitHub's public API, and store it on `team_members.github_username` for a future ticket-assignee → GitHub-issue-assignee sync.

## 1. Database migration
- Add `team_members.github_username text` (nullable, unique-citext-ish via simple unique index, case-insensitive).
- Add RLS policy `team_members: self update` so a user can update only their own row (`id = current_team_member_id()`). Existing PMBA policies remain.

```sql
ALTER TABLE public.team_members ADD COLUMN github_username text;
CREATE UNIQUE INDEX team_members_github_username_unique
  ON public.team_members (lower(github_username))
  WHERE github_username IS NOT NULL;

CREATE POLICY "team_members: self update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (id = current_team_member_id())
  WITH CHECK (id = current_team_member_id());
```

## 2. Modal component
`src/features/auth/GithubUsernamePrompt.tsx`
- Reads `user` from `useCurrentUser`. Renders nothing if `user?.github_username` is set.
- Non-dismissible `Dialog` (no close button, no overlay-click close, no Escape close).
- Single text input + Save button + helper copy ("We'll use this to assign you to GitHub issues when tickets are assigned to you.").
- Zod validation: GitHub username regex `^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$`.
- On submit:
  1. Validate format.
  2. `fetch('https://api.github.com/users/' + encoded)`:
     - `200` → use response `login` (canonical casing) as value to save.
     - `404` → "No GitHub user with that username".
     - `403` / network → "Couldn't reach GitHub, please try again".
  3. `supabase.from('team_members').update({ github_username }).eq('id', user.id)`. On unique-violation → "That GitHub account is already linked to another team member".
  4. Update local `useCurrentUser` store with the new user row.

## 3. Wiring
`src/App.tsx` — mount `<GithubUsernamePrompt />` once inside `RequireAuth`, alongside `TopBar`. It self-hides when the field is set, so no route filtering needed (`/login` and `/h/:hash` are outside `RequireAuth`).

## 4. Types
`src/integrations/supabase/types.ts` regenerates after the migration; `TeamMember` picks up `github_username` automatically. No manual edit.

## Out of scope
- The actual GitHub issue-assignment integration (you're building it).
- Admin UI to edit other members' GitHub usernames (PMBAs already have update rights — can add a field to `TeamAdmin` later).
- Re-prompting if GitHub later returns 404 for a stored username (assume stable).
