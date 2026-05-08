## Lock down dangerous SECURITY DEFINER RPCs

Right now four internal RPCs are callable by anyone over the public REST API. The most dangerous (`purge_project_children`) can wipe an entire project with a single curl call. This plan revokes public access to all internal RPCs while keeping the three client-portal RPCs intentionally public.

### What changes

**Revoke EXECUTE from `anon` and `authenticated` on internal RPCs:**
- `purge_project_children(uuid)` — destructive bulk delete
- `get_project_archive_payload(uuid)` — full project data dump
- `rehydrate_project(uuid, jsonb, jsonb)` — restore archived project
- `is_pmba(uuid)` — role lookup helper
- `reapply_status_rules()` — bulk recalculation
- `first_status_in_category(status_category)` — internal helper

**Keep public (the client portal needs these for un-authenticated clients with a hash):**
- `get_client_portal(text)`
- `get_client_portal_change_requests(text)`
- `client_approve_cr(text, uuid)`

### Why this is safe

- Edge functions (`archive-project`, `rehydrate-project`, `vault-download-url`) call these RPCs using the **service role key**, which bypasses GRANTs entirely. They keep working with zero code changes.
- The three portal RPCs that anonymous clients legitimately need stay open.
- No frontend code calls the locked-down RPCs directly — they're only invoked from edge functions.

### Technical detail

Single migration:

```sql
REVOKE EXECUTE ON FUNCTION public.purge_project_children(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_project_archive_payload(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rehydrate_project(uuid, jsonb, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_pmba(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reapply_status_rules() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.first_status_in_category(status_category) FROM anon, authenticated, public;
```

(Trigger functions like `derive_project_status`, `enforce_archive_invariants`, `apply_time_log`, etc. are not REST-exposed — they only run from triggers — so they don't need REVOKE.)

### Verification after deploy

1. Try archiving a project from the UI → should still work (edge function uses service role).
2. Try the client portal link → should still load (its RPC is still public).
3. From a curl call without service role:
   `POST /rest/v1/rpc/purge_project_children` → must return 401/403.

### Files changed

- 1 SQL migration. No frontend or edge function changes.
