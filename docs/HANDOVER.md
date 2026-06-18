# Developer Handover

Welcome. This doc gets you from zero to confidently shipping a change in ~15 minutes.

## 1. What this app is

A delivery-management workspace for the **old.st** team. Internally used: every authenticated user is a trusted teammate. The only public surface is the **client portal** (`/h/:hash`), reached by an unguessable hashed token.

Read the [README](../README.md) for the feature list and tech stack.

## 2. Mental model

Three audiences, three surfaces:

| Audience       | Surface                       | Auth                              |
| -------------- | ----------------------------- | --------------------------------- |
| Team members   | `/`, `/my-work`, `/projects/:id/*` | Supabase Auth (email/OAuth)  |
| PMBAs (admins) | `/admin`, vault, portal editor | Same + `PMBA` role in `user_roles` |
| Clients        | `/h/:hash`                    | Hashed portal token, no login     |

Roles live **only** in `user_roles`. Never put role flags on `profiles` or `team_members` (the column exists for display, not for auth decisions — RLS uses `has_role`).

## 3. Data flow (typical mutation)

```text
User action ─▶ React Hook Form + Zod ─▶ TanStack Query mutation
                                              │
                                              ▼
                                supabase-js (anon key, RLS)
                                              │
                                              ▼
                                Postgres RLS check ─▶ trigger ─▶ row
                                              │
                                              ▼
                              Realtime broadcast ─▶ invalidate query
```

For privileged ops (archive/rehydrate, AI calls, signed URLs) the SPA calls a **Supabase Edge Function** instead — the function verifies the JWT, checks PMBA where required, then uses the service-role key internally.

## 4. Where things live

| If you need to…                              | Look in…                                       |
| -------------------------------------------- | ---------------------------------------------- |
| Change ticket UI                             | `src/features/tickets/`                        |
| Tweak the kanban board                       | `src/features/board/`                          |
| Touch the bulk-assign dialog                 | `src/features/tickets/bulk-assign/` (+ `BulkAssignDialog.tsx`) |
| Edit the sprint Roadmap / Gantt              | `src/features/sprints/SprintGantt.tsx`, `src/features/sprints/gantt/` |
| Edit a sprint block (PMBA)                   | `src/features/sprints/sprint-block/EditSprintPopover.tsx`, `SprintBlockRow.tsx` |
| Change the Planning Pool / filters           | `src/features/sprints/PlanningPoolPanel.tsx`, `src/features/sprints/planning-pool/` |
| Touch estimate / CR math                     | `src/features/estimates/`, `src/features/change-requests/` |
| Edit the client portal (PMBA view or public) | `src/features/client-portal/`, `src/pages/ClientPortalPublic.tsx` |
| Add/change a database table                  | New migration via the Lovable agent (`supabase/migrations/`) |
| Add a privileged backend op                  | New folder under `supabase/functions/`         |
| Adjust theme / tokens                        | `src/index.css`, `tailwind.config.ts`          |
| Add a Zod schema                             | `src/lib/schemas/`                             |
| Add cross-feature hook                       | `src/hooks/`                                   |

## 5. First change — a worked example

Suppose you want to add a "low priority" badge to ticket cards:

1. **UI only?** Stay frontend. Edit `src/features/tickets/TicketCard.tsx`.
2. Use semantic tokens (`bg-muted text-muted-foreground`) — no hex codes.
3. Add a unit test next to it (`TicketCard.test.tsx`) using `renderWithProviders`.
4. Run `npm run lint && npm run test`.
5. Commit. Lovable builds + deploys automatically.

If you instead need a new `priority` column on `tickets`:

1. Ask the Lovable agent to create a migration (it'll add the column, update RLS if needed, regenerate `src/integrations/supabase/types.ts`).
2. After approval, the migration runs and types regenerate.
3. Use the new column in your component.

## 6. Golden rules

- **Never** import or hardcode the Supabase service-role key in the SPA. The only place it exists is `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` inside an edge function.
- **Never** disable RLS on a table. If a query is blocked, fix the policy, don't drop the guard.
- **Never** edit `src/integrations/supabase/types.ts` by hand — it regenerates from the live DB schema.
- **Never** edit past migrations. Add a new one.
- **Always** validate user input with Zod before sending it to Supabase.
- **Always** wrap async work in TanStack Query (don't fetch in `useEffect`).
- **Always** read the design system section of the README before touching styles.

## 7. Next reads

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the layers fit together
- [`SECURITY.md`](SECURITY.md) — the full security posture
- [`OPERATIONS.md`](OPERATIONS.md) — runbooks for production tasks
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — workflow & quality gates
