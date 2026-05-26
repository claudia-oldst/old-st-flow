## Goal

Stop having every mutation site remember to call `syncTicketToGithub`. Make GitHub sync a database-driven side effect: when ticket data that GitHub cares about changes, a Postgres trigger fires `pg_net.http_post` against the existing `github-sync-ticket` edge function. All 27 client callsites get deleted.

## Architecture

```
client mutation → tickets / ticket_assignees row change
                ↓ AFTER trigger (relevant columns only)
              public.enqueue_github_sync(ticket_id)
                ↓ pg_net.http_post (async, fire-and-forget)
              edge function github-sync-ticket
                ↓
              GitHub API
```

## Database migration

1. Enable `pg_net` extension (Supabase: built-in but may need `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;`).
2. Create `public.app_settings(key text PK, value text)` — single-row config for `edge_function_base_url` and `github_sync_secret`. RLS: only `current_is_pmba()` can read/write; trigger function is `SECURITY DEFINER` so it bypasses RLS.
3. Create `public.enqueue_github_sync(_ticket_id uuid) returns void` (SECURITY DEFINER):
   - Reads URL + secret from `app_settings`
   - If either missing → no-op (sync disabled)
   - Calls `net.http_post(url, body := jsonb_build_object('ticket_id', _ticket_id), headers := jsonb_build_object('Content-Type','application/json','x-sync-secret', secret))`
4. Trigger function `public.tickets_github_sync_trg()` AFTER INSERT OR UPDATE on `tickets` — fires only when one of these columns changed: `title, acceptance_criteria, status_id, fe_status, be_status, epic_id, ticket_type, current_fe_estimate, current_be_estimate, current_project_estimate, version, parent_ticket_id`. Calls `enqueue_github_sync(NEW.id)`.
5. Trigger function `public.assignees_github_sync_trg()` AFTER INSERT OR DELETE OR UPDATE on `ticket_assignees`. Calls `enqueue_github_sync(coalesce(NEW.ticket_id, OLD.ticket_id))`.
6. Both triggers are statement-level safe but written FOR EACH ROW (pg_net dedups by URL+body within batches in practice; duplicate calls are idempotent in the edge function).

## Edge function update

`supabase/functions/github-sync-ticket/index.ts`:
- If incoming request has header `x-sync-secret` matching `Deno.env.get('GITHUB_SYNC_SECRET')`, bypass user-JWT validation and the RLS access check (skip the `userClient` call entirely).
- Otherwise keep existing JWT path (so manual replays / future direct calls still work).

## Client cleanup

Delete `src/features/github/syncTicket.ts` and remove every `syncTicketToGithub` / `syncTicketsToGithub` import + call in the 12 files listed:

```
useBoardDnd.ts, ProjectChangeRequests.tsx, useLogTime.ts, BulkActionsBar.tsx,
AssignDialog.tsx, RequestMoreTimeDialog.tsx, useTicketEditor.ts, StatusBlock.tsx,
AcceptanceCriteria.tsx, useBulkAssign.ts, QuickAddRow.tsx, TicketDetailBody.tsx
```

Each callsite is `void syncTicketToGithub(id)` (or the bulk variant) with no awaited result, so removal is safe.

## One manual step (after migration approved)

User adds a shared secret:
1. Add `GITHUB_SYNC_SECRET` to edge function secrets (I'll use the secrets tool).
2. Run one-liner in SQL editor to mirror it into `app_settings` (I'll provide it). Without this, triggers no-op and sync is silently disabled — safe default.

## Notes / trade-offs

- `pg_net` is async and fire-and-forget; failures are visible in `net._http_response`. No client-side toast on failure anymore — acceptable since most existing callsites are already `void`-ed.
- We lose the immediate `toast.error` UX. Can add a lightweight admin-only monitor later if needed.
- Bulk operations (e.g. `useBulkAssign` over N tickets) now fan-out N trigger calls; pg_net handles backpressure.
- `github_issue_number`/`node_id` are written by the edge function itself — excluded from trigger columns so the writeback doesn't re-fire the trigger.
