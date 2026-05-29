# Fix: client portal URL resolves to "This portal isn't available"

## Root cause

`pgcrypto` lives in the `extensions` schema. The portal hash lookup functions were created with `SET search_path = public`, so the `digest(...)` call inside them fails with `function digest(unknown, unknown) does not exist`. The RPC throws, the public page shows the generic "This portal isn't available" fallback, even though the hash is valid and the project is published.

Verified: the project row exists with `client_portal_hash = '345g6g466u0z0k0i'`, `client_portal_hash_sha` set, and `client_visibility_cutoff` populated — so data is fine; only the function resolution is broken.

## Fix

New migration that recreates the three affected functions with `SET search_path = public, extensions` (matches Supabase's recommended pattern and resolves `digest` / `gen_random_bytes` without dropping security_definer hardening):

1. `public.rotate_client_portal_hash(uuid)`
2. `public.get_client_portal(text)`
3. `public.get_client_portal_change_requests(text)`
4. `public.client_approve_cr(text, uuid)` — same pattern, same fix

Function bodies are unchanged apart from the `SET search_path` line. Existing `GRANT EXECUTE` on `anon` / `authenticated` is preserved (CREATE OR REPLACE keeps grants).

No frontend changes. No data migration needed — `client_portal_hash_sha` was already backfilled at migration time when default search_path included extensions.

## Verification after deploy

- Reload `/h/345g6g466u0z0k0i` — should render the portal.
- PMBA "Publish to client" rotates a fresh 64-hex token and the new URL also resolves.
