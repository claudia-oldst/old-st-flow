# Architecture

## Layers

```text
pages/          ← Route entry points. Thin. Compose features.
features/<x>/   ← Self-contained domain modules. Own their hooks, components, types, tests.
components/     ← Cross-feature presentational primitives (TopBar, ErrorBoundary, etc.)
components/ui/  ← shadcn primitives. Extend via variants, do not fork.
hooks/          ← Cross-feature hooks (realtime, viewport, toast).
lib/            ← Pure utilities and Zod schemas. No React, no Supabase.
integrations/   ← External SDK wiring (Supabase client + generated types).
store/          ← Zustand stores for client-only state (timer, current user cache).
```

Rule of thumb: a `feature/` may import from `components/`, `components/ui/`, `hooks/`, `lib/`, `integrations/`, `store/`. It should **not** import from another `feature/` directly — extract the shared piece to `_shared/`, `components/`, or `lib/`.

## State

- **Server state** → TanStack Query. Queries are keyed `[domain, scope, ...args]`, e.g. `["tickets", projectId, filters]`. Mutations invalidate the queries they invalidate.
- **Client state** → Zustand for things that need to survive across components (timer, current user). React state for everything local.
- **Realtime** → `useRealtimeInvalidate` / `useRealtimeReload` subscribe to Supabase Realtime and invalidate the relevant query keys.

## Two-tier ticket status

Tickets have:

- `fe_status`, `be_status`: per-discipline enum (`todo` | `in_progress` | `done`)
- `status_id`: project-level status (FK to `statuses` table)
- `project_status_override`: boolean

Triggers in Postgres derive `status_id` from `fe_status` + `be_status` using `status_derivation_rules`. If a PMBA picks a status manually, `project_status_override` flips to true and the trigger leaves it alone. Touching FE/BE again clears the override.

Don't reimplement this logic client-side — read it from the DB.

## Estimates

Each ticket has, per discipline (FE/BE/Project):
- `original_*_estimate` — the baseline (snapshotted at create or first commit)
- `current_*_estimate` — the live estimate
- `actual_*_hours` — sum of approved time logs

Every change to a current estimate writes a `ticket_estimate_changes` row with `previous_hours`, `new_hours`, `reason`, and a `status` (`pending` | `approved` | `rejected`). CR-type tickets carry their own approval lifecycle (`cr_approval`, `cr_decided_by`, `cr_decided_at`).

Two automatic adjustments live in Postgres triggers:
- `snap_estimates_on_dev_done` — when status moves to a `dev done` category, trim each `current_*_estimate` down to `actual_*_hours` (logs a change row attributed to the actor).
- `trim_estimates_on_done` — same idea when status enters `done`.

## Sprints — Roadmap, Planning Pool, Gantt

The Sprints tab (`/projects/:id/sprints`) has two coordinated surfaces:

- **Roadmap** (`SprintGantt` + `gantt/useGanttData.ts`) — a Gantt chart of epics × sprints.
  - **Every epic** renders, sorted alphabetically by name, even when it has no segments. Empty epics fall back to the earliest sprint's date range so the row is still anchored. Tickets without an epic land in a `"none"` bucket.
  - Discipline filter has three modes: **FE**, **BE**, and **ALL**. `ALL` merges FE and BE rows in-memory via `mergeGanttRows()` — keyed by `epicId` (or `epicName` for `"none"`), segments merged by `sprintId` summing `todo / in_progress / for_integration / done / total / committed / planned`, and `isCommitted` OR-ed across disciplines.
  - PMBAs author and edit sprint blocks inline through `sprint-block/EditSprintPopover.tsx` (name, start/end dates, FE/BE capacity).

- **Planning Pool + Dev columns** (`PlanningPoolPanel`, `PlanningDevColumn`) — drag tickets from the pool into per-sprint per-discipline columns.
  - The pool's roadmap filter (`planning-pool/PoolFilterBar.tsx`) lists every sprint plus `UNPLANNED` and an **All** toggle (`ALL_ROADMAPS`). Selecting `ALL_ROADMAPS` skips roadmap filtering entirely; toggling an individual entry clears `ALL_ROADMAPS` and vice versa.
  - Group/aggregate logic lives in `planning-pool/usePoolGroups.ts`.

Both surfaces subscribe to Supabase Realtime on the `sprints`, `tickets`, and ticket-assignment tables via `useRealtimeInvalidate`, so sprint edits, ticket moves, and assignment changes propagate across users without a refresh.

## Bulk assign (diff-based)

`src/features/tickets/bulk-assign/useBulkAssign.ts` loads existing FE/BE/Project assignees for the selected tickets on open and pre-selects them. Each user chip in `BulkAssignSlot.tsx` renders one of three states:

- **Assigned to all** selected tickets — fully highlighted.
- **Partial** — highlighted with an `n/m` indicator (driven by a `partial: Set<string>` prop).
- **Unassigned** — muted.

Save computes, per slot, the desired `(ticket_id, user_id, slot)` set and applies a single insert (desired − existing) and a single delete (existing − desired) — no full wipe. Tickets that end with no FE/BE assignee have the corresponding discipline status reset (existing behavior).

## Client portal

- The PMBA composes a snapshot in `src/features/client-portal/ClientPortalEditor.tsx`. It writes to `project_epic_summaries` and `projects.client_summary_*`.
- Publish rotates a 32-byte token (`rotate_client_portal_hash` RPC) and stores both the raw value (`client_portal_hash`) and its sha256 (`client_portal_hash_sha`).
- Public clients hit `/h/:hash`, which calls `get_client_portal(hash)`. The RPC resolves the project via the sha256 of the hash, returning a curated payload only.
- CRs are approved/rejected by clients via `client_approve_cr(hash, ticket_id)`. All three public RPCs are `SECURITY DEFINER` and take the hash as a capability.

## Vault (archive / rehydrate)

`archive-project` edge function (PMBA-only):
1. Builds a JSON dump via `get_project_archive_payload` RPC.
2. Builds a human-readable XLSX summary.
3. Uploads both to the private `project-vault` bucket.
4. Downloads the JSON and re-hashes it to verify integrity (sha256).
5. Marks the project archived, then calls `purge_project_children` RPC to delete tickets/logs/comments/etc.

`rehydrate-project` reverses it: verifies the vault checksum, optionally remaps user IDs, then calls the `rehydrate_project` RPC inside a single transaction (which uses `app.allow_unarchive` session var to bypass the no-unarchive trigger).

Both destructive RPCs have `EXECUTE` revoked from every role — only the service role can call them, and only via these PMBA-gated edge functions.

## Edge functions

| Function                          | Auth          | What it does |
| --------------------------------- | ------------- | ------------ |
| `archive-project`                 | JWT + PMBA    | Dump + verify + purge a project |
| `rehydrate-project`               | JWT + PMBA    | Restore an archived project from vault |
| `vault-download-url`              | JWT + PMBA    | Mint a short-lived signed URL for vault files |
| `epic-summary`                    | JWT           | AI-generate an epic narrative (Lovable AI Gateway) |
| `generate-acceptance-criteria`    | JWT           | AI-generate AC for a ticket |
| `daily-logoff-summary`            | scheduled     | Compose end-of-day digest per user |

Every function lives in `supabase/functions/<name>/index.ts` and is auto-deployed by Lovable.

## Realtime

`useRealtimeInvalidate(table, queryKeys)` is the standard pattern. It subscribes once per mounted component, debounces bursts, and invalidates the listed TanStack Query keys. Use it sparingly — over-subscribing fans out re-renders.

## Error handling

- Every route is wrapped in `ErrorBoundary` (see `src/components/ErrorBoundary.tsx`).
- Toast errors via Sonner for user-facing failures; throw for programmer errors so the boundary catches them.
- Supabase errors carry a `message` field — pass it straight to the toast.
