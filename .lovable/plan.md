# Star projects to pin them to the top

Let each user mark projects as favourites. Starred projects always appear first in the projects list, in their own "Pinned" row.

## What the user sees

- A star icon in the top-right corner of every project card. Click it to star/unstar without opening the project.
- Starred projects show a filled gold star; unstarred show a faint outline star that becomes visible on hover.
- The list shows a "Pinned" section at the top (page 1 only) with all starred projects, then the normal grid below.
- Favourites are per-user and private — starring a project doesn't affect anyone else's view.
- Search and status filters also apply to the pinned section, so if a starred project doesn't match the filters it isn't shown.
- Pinned projects are removed from the normal grid so they never appear twice; pagination counts adjust accordingly.

## Database

New table `project_favorites`:
- `user_id` (the team member), `project_id`, `created_at`, primary key on both columns.
- Access rules: a signed-in user can view, add, and remove only their own favourites. Nobody can see or change another user's favourites.
- Deleting a project removes its favourite rows.

## Technical notes

- Migration: `CREATE TABLE public.project_favorites` with FKs to `public.team_members(id)` and `public.projects(id)` (both `ON DELETE CASCADE`), then GRANTs (`SELECT, INSERT, DELETE` to `authenticated`, `ALL` to `service_role`), then `ENABLE ROW LEVEL SECURITY`, then policies scoped to `current_team_member_id()`.
- `useProjectsList.ts`: fetch the current user's favourite project ids, then
  - exclude those ids from the paged query (`.not("id", "in", ...)`) so ordering/pagination stay stable,
  - run a second query for the favourite projects with the same status/search filters, sorted by name, returned as `pinned`,
  - only return `pinned` when `page === 1`,
  - include ticket/member counts for pinned projects using the existing count logic,
  - add `project_favorites` to the realtime reload tables.
- New `useToggleFavorite` helper in the same feature folder: insert/delete on `project_favorites`, optimistic update, error toast on failure.
- `ProjectCard.tsx`: add `isFavorite` + `onToggleFavorite` props; render a star button positioned absolutely top-right (uses `Star` from lucide, `fill-brand-gold` when active). Button uses `e.preventDefault(); e.stopPropagation()` so it doesn't navigate the wrapping `Link`.
- `Projects.tsx`: render the pinned grid above the main grid with a small "Pinned" label; keep the existing "Showing N–M of T" counter reflecting the unpinned result set.
- No new sort option — pinning is independent of the selected sort.
