# Security Posture

This document describes how the app is hardened. It is the source of truth for security reviews.

## Access model

The app is an **internal tool**. Every authenticated user is a trusted teammate and may read across projects. The only un-authenticated surface is the **client portal**.

| Surface           | Who can reach it                    | How it's gated                                |
| ----------------- | ----------------------------------- | --------------------------------------------- |
| `/login`          | Anyone                              | Public                                         |
| `/`, `/projects/*`, `/my-work` | Signed-in team members  | `RequireAuth` (client) + RLS (server)         |
| `/admin`          | Signed-in PMBAs                     | `RequirePMBA` (client) + `current_is_pmba()` RLS (server) |
| `/h/:hash`        | Anyone with the portal URL          | sha256-hashed token resolved server-side       |

Client-side guards are convenience; **server-side RLS + edge-function checks are the actual enforcement**.

## Authentication

- Supabase Auth (email/password + OAuth providers configured in the Lovable dashboard).
- The SPA only ever holds the **anon publishable key** (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- The service-role key lives only in edge-function env (`SUPABASE_SERVICE_ROLE_KEY`) and is never sent to the browser.

On sign-up, the `link_team_member_on_signup` trigger matches the new `auth.users` row to a pre-existing `team_members` row by email, populating `auth_user_id`.

## Authorization

Roles live in `user_roles` keyed on `team_members.id`:

```sql
create type public.app_role as enum ('PMBA', 'member');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.team_members(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
```

`team_members.role` exists for display only — RLS never reads it. The source of truth is `user_roles`, accessed through `SECURITY DEFINER` helpers to avoid policy recursion:

- `public.has_role(_user_id uuid, _role app_role) → boolean`
- `public.current_team_member_id() → uuid`
- `public.current_is_pmba() → boolean`
- `public.current_is_project_member(_pid uuid) → boolean`
- `public.current_can_access_ticket(_ticket_id uuid) → boolean`

A trigger (`sync_team_member_role_to_user_roles`) keeps `user_roles` in sync when the display column changes — but inserting directly into `user_roles` is also supported.

## Row-Level Security

RLS is **enabled on every table** in the `public` schema. The standard pattern for project-scoped tables is:

```sql
-- read: project members or PMBA
create policy "read_if_member_or_pmba" on public.<table> for select
  using (public.current_is_pmba() or public.current_is_project_member(project_id));

-- write: same, with role check on top where appropriate
```

Sensitive admin tables (`statuses`, `status_derivation_rules`, `user_roles`) are PMBA-only for writes.

## Storage

| Bucket              | Visibility | Reads                                    | Writes |
| ------------------- | ---------- | ---------------------------------------- | ------ |
| `ticket-attachments` | Private   | Authenticated members, via signed URL    | Authenticated, project members |
| `project-vault`      | Private   | PMBAs, via `vault-download-url` edge fn  | Service role only (archive fn) |

Attachments: the upload helper (`uploadCommentAttachment.ts`) stores only the storage `path`. The viewer (`CommentItem.tsx`) calls `getAttachmentSignedUrl(path)` to mint a short-lived URL on demand.

Vault: paths are never exposed to the client. The PMBA UI calls `vault-download-url` which verifies the JWT + PMBA role and returns a signed URL.

## Edge functions

Every edge function performs JWT verification before doing work:

```ts
const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
if (error || !user) return new Response("Unauthorized", { status: 401 });
```

Functions that mutate sensitive state additionally check the PMBA role via `is_pmba` after resolving the caller's `team_members.id`:

- `archive-project` — JWT + PMBA
- `rehydrate-project` — JWT + PMBA
- `vault-download-url` — JWT + PMBA
- `epic-summary` — JWT (rate-limit via Lovable AI Gateway)
- `generate-acceptance-criteria` — JWT
- `daily-logoff-summary` — scheduled, runs as service role

CORS is locked to `Authorization, x-client-info, apikey, content-type` and origin `*` (browser-safe; the auth check is the actual gate).

## Destructive RPCs

Two RPCs can destroy or inject large amounts of data:

- `public.purge_project_children(uuid)` — deletes tickets, time logs, comments, assignees, estimate changes, epic summaries for a project.
- `public.rehydrate_project(uuid, jsonb, jsonb)` — inserts arbitrary rows from a JSON payload.

Both have `EXECUTE` **revoked from `anon`, `authenticated`, and `public`**. They are callable only via the service role inside the PMBA-gated `archive-project` and `rehydrate-project` edge functions.

## Anon-callable RPCs (intentional)

The only `SECURITY DEFINER` functions executable by `anon` are the three client-portal RPCs:

| Function                                  | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `get_client_portal(_hash text)`           | Read-only portal snapshot for the given hash |
| `get_client_portal_change_requests(_hash)` | List CRs visible to the client               |
| `client_approve_cr(_hash, _ticket_id)`    | Client clicks "approve" on a CR              |

Each takes the portal hash as a **capability**. The DB resolves the project via sha256 of the hash (`client_portal_hash_sha`), so even if a `projects` row leaked through a misconfigured policy, the active URLs would still not be recoverable.

When a project is archived, `enforce_archive_invariants` clears `client_portal_hash`, killing any active portal link.

## Input validation

User input flows through Zod schemas (`src/lib/schemas/`) before reaching Supabase: tickets, comments, project settings, client portal copy, change requests. Backend triggers re-validate invariants the schema can't express (epic belongs to project, parent ticket is Standard/CR, assignee role matches slot, etc.).

## What should never happen

- The service-role key reaches the browser, an env var commit, or a caller token.
- Any new table is created without RLS.
- A new `SECURITY DEFINER` function is exposed to `anon` or `authenticated` without an explicit access check inside the function body.
- Roles are stored on `profiles` or `team_members` for auth decisions.
- A bucket holding user uploads is set to `public`.

## Reporting

Suspected vulnerability? File a private ticket in the team's secure tracker (do not open a public issue) and ping the PMBA on call. See [`OPERATIONS.md`](OPERATIONS.md#incident-response).
