# Operations Runbook

Production tasks you'll need to do at some point. All assume access to the Supabase project via the Lovable Cloud dashboard.

## Granting PMBA

```sql
-- 1. Ensure the person has a team_members row (insert if not).
insert into public.team_members (email, name, role)
values ('alice@old.st', 'Alice', 'PMBA')
on conflict (email) do update set role = excluded.role;

-- 2. Grant the role explicitly.
insert into public.user_roles (user_id, role)
select id, 'PMBA'::public.app_role
from public.team_members
where lower(email) = 'alice@old.st'
on conflict do nothing;
```

When Alice signs up, the `link_team_member_on_signup` trigger populates `auth_user_id` from her email.

## Removing access

```sql
-- Revoke PMBA but keep the user
delete from public.user_roles
where user_id = (select id from public.team_members where lower(email) = 'alice@old.st')
  and role = 'PMBA';

-- Or fully remove the team member (cascades to user_roles, project_members, assignees)
delete from public.team_members where lower(email) = 'alice@old.st';
```

The auth user row in `auth.users` is separate — delete it from the Lovable dashboard → Users if you also want to revoke sign-in.

## Rotating a client portal link

The portal URL is `https://<your-domain>/h/<hash>`. To rotate (the old URL stops working immediately):

```sql
select public.rotate_client_portal_hash('<project-uuid>');
-- returns the new hash; the UI in the portal editor does this for you.
```

The function is PMBA-only and updates both `client_portal_hash` and `client_portal_hash_sha`.

## Archiving a project

1. Open the project → **Vault** → **Archive**.
2. The `archive-project` edge function:
   - dumps the project to `project-vault` bucket as JSON + XLSX,
   - verifies the JSON checksum,
   - flips `is_archived = true`,
   - calls `purge_project_children` to delete tickets/logs/comments/etc.
3. The client portal link is cleared automatically.

If the function errors after upload but before purge, the project stays un-archived — safe to retry.

## Restoring from vault

1. Open the project → **Vault** → **Rehydrate**.
2. If users referenced in the dump no longer exist, the function returns `missing_users` — supply a `member_map` (old id → new id) and re-submit.
3. Optionally tick **Delete vault files after restore**.

If the JSON checksum doesn't match the stored `vault_checksum`, the restore aborts (vault is corrupted) — investigate before forcing.

## Rotating secrets

| Secret                       | How to rotate                                                  |
| ---------------------------- | -------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase dashboard → Settings → API → "Reset service role". Then update edge-function env in the Lovable Cloud secrets panel. |
| `LOVABLE_API_KEY`            | Use the Lovable `rotate_lovable_api_key` action (do not delete/recreate). |
| OAuth client secrets         | Provider dashboard → rotate → update in Supabase Auth providers. |
| Portal hashes                | `rotate_client_portal_hash(project_id)` per project.            |

Never store secrets in Postgres tables.

## Inspecting edge function logs

Lovable Cloud → Edge Functions → pick a function → **Logs**. Or via the Supabase dashboard at `https://supabase.com/dashboard/project/<ref>/functions/<name>/logs`.

Common things to look for:
- `401 Missing bearer token` — caller forgot to attach the JWT (likely a client bug).
- `403 PMBA role required` — non-PMBA hit a privileged endpoint.
- `Checksum mismatch after upload` — storage write corrupted; do **not** retry, investigate.

## Running migrations

You don't run migrations by hand. Ask the Lovable agent in chat to make the change; it'll generate a SQL file under `supabase/migrations/`, you approve it, and it runs.

Past migrations are immutable. If a migration was wrong, write a new one that fixes it forward.

## Backups

Supabase takes automatic daily backups. To restore a point-in-time:
1. Supabase dashboard → Database → Backups.
2. Pick a timestamp, create a recovery branch, validate, then promote.

The **vault** is a separate, app-level cold storage for archived projects — it is not a backup mechanism for live data.

## Incident response

1. **Triage**: confirm scope. Is data exposed? Are writes happening that shouldn't?
2. **Stop the bleeding**:
   - If a token leaked: rotate it.
   - If a policy is wrong: write a migration tightening it.
   - If an edge function is misbehaving: delete it (`supabase delete edge function`) — Lovable will redeploy on the next push, but at least it's offline now.
3. **Communicate**: ping the PMBA on call. For client-data exposure, follow old.st's incident communication policy.
4. **Post-mortem**: write up what happened, what fixed it, and which `docs/` page needs an update so the lesson sticks.

## Monitoring

- **Frontend errors**: console + `ErrorBoundary` UI. Hook up a service (Sentry, etc.) by wrapping `ErrorBoundary` if needed.
- **Backend errors**: edge function logs (above) + Supabase Postgres logs.
- **Realtime health**: Supabase dashboard → Realtime → channels.

## Performance

If the app is slow:
1. Check the Supabase **Performance** tab for slow queries.
2. Most large tables (`tickets`, `time_logs`, `ticket_estimate_changes`) already have indexes on `(project_id)` and `(ticket_id)`. Add new ones via migration if a new query pattern shows up.
3. Frontend bundle size: `npm run build` reports per-chunk sizes. Lazy-route splits live in `src/App.tsx`.

If the Cloud project itself has outgrown its instance size: Lovable Cloud → Overview → Advanced settings → pick a larger instance (a few minutes downtime).
