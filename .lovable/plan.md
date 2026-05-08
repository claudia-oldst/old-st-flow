## Project Vault — Archive & Re-hydrate completed projects

Goal: let PMBAs move finished projects to "cold storage" (JSON + Excel in Supabase Storage) so the live DB only keeps a skeleton row, and let them rehydrate later with full fidelity. Add search + filter to the Projects list so vaulted projects don't clutter the workspace.

Portal visibility uses what already exists: a project is "live to clients" when `client_portal_hash` AND `client_visibility_cutoff` are set. Archiving nulls `client_portal_hash` (kills the public link) and stashes the prior hash inside the vault payload so rehydrate can restore it.

---

### 1. Database migration

Add to `projects`:
- `is_archived boolean not null default false`
- `archived_at timestamptz`
- `vault_storage_path text`
- `cached_total_hours numeric not null default 0`
- `cached_total_cost numeric not null default 0`
- `vault_checksum text`
- `vault_row_counts jsonb`

Trigger `enforce_archive_invariants` on `projects` BEFORE UPDATE:
- When `is_archived` flips true → force `client_portal_hash = NULL`.
- Block flipping `is_archived` true → false in raw SQL (must go through `rehydrate_project` RPC).

Storage bucket `project-vault` (private). RLS on `storage.objects`: read/write only for `has_role(auth.uid(), 'PMBA')`. Downloads via signed URLs.

RPCs (`SECURITY DEFINER`, PMBA-gated at top):
- `get_project_archive_payload(_project_id uuid) returns jsonb` — full relational dump (project incl. current `client_portal_hash`/`client_visibility_cutoff`, project_members, project_epics, tickets, ticket_assignees, ticket_comments, ticket_estimate_changes, time_logs, project_epic_summaries). Excludes `active_timers*`.
- `purge_project_children(_project_id uuid)` — FK-safe child deletes.
- `rehydrate_project(_project_id uuid, _payload jsonb, _member_map jsonb) returns void` — single tx; re-inserts with original UUIDs, applies user remap, restores `client_portal_hash`/cutoff, sets `is_archived=false`, clears vault columns.

### 2. Public portal safety

Archiving nulls `client_portal_hash` → `get_client_portal()` already returns NULL → existing "portal isn't available" copy in `ClientPortalPublic.tsx` covers it. No portal-RPC changes needed.

### 3. Edge functions

`supabase/functions/archive-project/index.ts` (PMBA JWT verified in code):
1. Call `get_project_archive_payload` → `restore_point.json`.
2. Build `project_summary.xlsx` with `npm:xlsx` in Deno. Tabs: Summary, Tickets, Time Logs, Change Requests, Comments.
3. SHA-256 the JSON.
4. Upload both to `project-vault/{project_id}/...` (service-role client).
5. Re-download JSON and re-checksum (integrity gate).
6. Update `projects` (is_archived, archived_at, vault_storage_path, cached totals, vault_checksum, vault_row_counts). Trigger nulls portal hash.
7. Call `purge_project_children`.
8. Return `{ ok, vault_storage_path, checksum, counts }`.

Failure before step 7 → no destructive action. Step 7 only runs after step 6 succeeds.

`supabase/functions/rehydrate-project/index.ts` (PMBA-gated):
1. Read `restore_point.json`, verify against stored `vault_checksum`.
2. Diff `user_id`s in payload vs current `team_members`. If unmapped + no `_member_map` → return `{missing_users:[…]}`.
3. Call `rehydrate_project` RPC with merged map.
4. Optional vault folder delete (UI toggle, keep by default).

`supabase/functions/vault-download-url/index.ts` — short-lived signed URL for `restore_point.json` or `project_summary.xlsx` (PMBA-gated).

### 4. Frontend — Vault

New files:
- `src/features/vault/useArchiveProject.ts` — mutation, invalidates `["projects"]`.
- `src/features/vault/useRehydrateProject.ts` — mutation + member-mapping flow.
- `src/features/vault/MemberRemapDialog.tsx` — one "Former Member" placeholder per missing user (preserves identity), or pick replacement.
- `src/features/vault/VaultDashboard.tsx` — stats cards (cached hours/cost), Download Excel, Download JSON, Re-hydrate button (PMBA only).
- `src/features/vault/ArchiveProjectDialog.tsx` — confirmation with "type project acronym" guard, lists row counts that will be deleted.

Edits:
- `src/pages/ProjectWorkspace.tsx` — when `project.is_archived`, render `<VaultDashboard project={project} />` instead of tab routes.
- `src/features/project/ProjectSettingsDialog.tsx` — add "Archive project" button (PMBA only, only when not archived).

### 5. Frontend — Projects list: search + filter + vault treatment

Rewrite `src/pages/Projects.tsx` toolbar above the grid:

```
[ Search by name / acronym / client ...... ]   [ Status: All ▾ ]   [ Sort: Newest ▾ ]
```

Components/behavior:
- **Search input** (debounced 200ms, clearable, `Cmd/Ctrl+K` focus) — matches `name`, `acronym`, `client_name` case-insensitive.
- **Status filter** (`Select`): `Active` (default), `Vaulted`, `All`.
- **Sort** (`Select`): `Newest`, `Oldest`, `Name A→Z`, `Recently archived` (only when status ≠ Active).
- **Server-side**: extend the `load()` query to apply `ilike` on the three columns, `eq('is_archived', …)` per filter, and `order(...)` per sort. Pagination already exists (`ListPagination`) — keep it; reset to page 1 when search/filter/sort change.
- **Empty states**: differentiate "no projects yet" vs "no results match" (with a "Clear filters" button).

Vaulted card treatment (when shown):
- `Vaulted` badge (gold accent, top-right corner of the card).
- `opacity-60 grayscale` on the card body, clickable (routes to `<VaultDashboard>`).
- Footer line replaces ticket/member counts with `Archived <relative-time>`.

URL sync: persist `?q=...&status=...&sort=...&page=...` in the query string so refresh/share preserves view.

### 6. Security

- Edge functions verify JWT + check `has_role(auth.uid(), 'PMBA')` before any DB call.
- Storage RLS: PMBA-only on `project-vault/*`. Downloads via signed URLs.
- RPCs assert PMBA at top.
- Trigger blocks raw-SQL un-archive.

### 7. Technical safeguards

- Checksum verified post-upload before purge, and again before rehydrate.
- `vault_row_counts` checked after rehydrate (must match payload).
- Rehydrate runs in one RPC = single transaction.

---

### Files to create
```
supabase/migrations/<ts>_project_vault.sql
supabase/functions/archive-project/index.ts
supabase/functions/rehydrate-project/index.ts
supabase/functions/vault-download-url/index.ts
src/features/vault/useArchiveProject.ts
src/features/vault/useRehydrateProject.ts
src/features/vault/VaultDashboard.tsx
src/features/vault/ArchiveProjectDialog.tsx
src/features/vault/MemberRemapDialog.tsx
src/components/ProjectsToolbar.tsx
```

### Files to edit
```
src/pages/Projects.tsx           (toolbar, search/filter/sort, vault treatment)
src/pages/ProjectWorkspace.tsx   (vault dashboard route)
src/features/project/ProjectSettingsDialog.tsx  (Archive button)
```

### Open question
After successful rehydrate, **delete the vault folder** or keep as permanent backup? (Default: keep, with a "Delete vault" button on the restored project's settings.)
