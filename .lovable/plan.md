## Visibility & access scoping

### Rules to enforce
- **PMBA**: full transparency — every project and every ticket.
- **Non-PMBA (Frontend, Backend, Fullstack, QA)**: only projects they appear in `project_members` for, and only tickets inside those projects.
- **My Tickets / "Mine" toggle**: filter on top of the above — only tickets where the signed-in user is an assignee.
- **/my-work** and **daily AI work summary**: signed-in user only — no user switcher, no impersonation.
- **/admin**: PMBA only — others redirected to `/`.
- **/h/:hash client portal**: stays fully public, no auth.

### Frontend gating

1. **`useVisibleProjects` (new hook)** wrapping `useProjectsList`
   - If `user.role === 'PMBA'` → return all projects.
   - Else → filter to projects where a `project_members` row exists for `user.id`.
   - Used by `Projects.tsx`, `MyWork.tsx` project picker, vault, etc.

2. **Project route guard** in `ProjectWorkspace.tsx`
   - Use `useProjectRole(projectId)`; if user is not PMBA and has no `project_members` row → render "You don't have access to this project" and a back link (don't 404).

3. **Admin guard** — extend `RequireAuth` (or add `RequirePMBA`) so `/admin` redirects non-PMBA users to `/`.

4. **MyWork (`/my-work`)**
   - Remove any user-picker UI; always read `useCurrentUser().user.id`.
   - Scope queries (tickets, time logs, capacity) to the signed-in user id.
   - Project list inside MyWork uses `useVisibleProjects`.

5. **Daily AI work summary** (`LogoffSummaryButton` / `daily-logoff-summary` edge function)
   - UI: only renders for the logged-in user; remove any cross-user selection.
   - Edge function: derive `user_id` from the verified JWT (`supabase.auth.getUser`) instead of trusting a `user_id` payload field. Reject if no session.

6. **"My Tickets" filter** — already filters by `assignees.user_id === user.id` via `filterMineUserId`. Keep as-is; verify it still works after the project-scoping changes.

### Backend (RLS) — defense in depth

Current policies are all `USING (true)`. Tighten the high-value tables so the frontend filtering can't be bypassed:

- Add SQL helper `public.is_project_member(_uid uuid, _pid uuid)` (SECURITY DEFINER).
- Replace permissive SELECT policies with:
  - `projects`: PMBA OR `is_project_member(auth.uid(), id)`.
  - `tickets`, `ticket_assignees`, `ticket_comments`, `ticket_estimate_changes`, `time_logs`, `active_timers`, `active_timer_tickets`, `project_epics`, `project_epic_summaries`, `epic_discounts`, `project_members`: PMBA OR project member of the row's project.
  - `team_members`, `statuses`, `status_derivation_rules`: keep readable by all signed-in users (needed for avatars/labels).
- INSERT/UPDATE/DELETE policies: PMBA always allowed; project members allowed for their project's rows (matching today's app behavior). Admin-config tables (`statuses`, `status_derivation_rules`, `team_members`) become PMBA-only for writes.
- Time logs / comments writes additionally require `user_id = auth.uid()` (except PMBA).
- Client portal RPCs (`get_client_portal*`, `client_approve_cr`) stay `SECURITY DEFINER` so the public `/h/:hash` route still works.

Existing helper `public.is_pmba(_user_id uuid)` is reused.

### Files to change

- New: `src/features/projects/useVisibleProjects.ts`, `src/features/auth/RequirePMBA.tsx`
- Edit: `src/App.tsx` (wrap `/admin` with `RequirePMBA`), `src/pages/Projects.tsx`, `src/pages/MyWork.tsx`, `src/pages/ProjectWorkspace.tsx`, `src/features/logoff/LogoffSummaryButton.tsx`, `src/features/logoff/LogoffSummaryDialog.tsx`, `supabase/functions/daily-logoff-summary/index.ts`
- Migration: helper function + replacement RLS policies on the tables above.

### Open question
The RLS tightening is the biggest behavioral change — once enforced, any code path that today queries data without going through a project membership will start returning empty results. Want me to (a) ship UI gating + RLS together, or (b) ship UI gating first and add RLS as a follow-up after we verify nothing breaks?