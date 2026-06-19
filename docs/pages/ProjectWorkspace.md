# Project Workspace (`/projects/:id/*`)

**Source:** `src/pages/ProjectWorkspace.tsx` · **Protected** + project-membership gate (`useProjectAccess`)

## Purpose
Single-project shell. Loads the project, gates membership, and renders nested tabs for tickets, change requests, sprints, health and the client portal editor.

## Data
- `supabase.from("projects").select("*").eq("id", id).maybeSingle()` on mount and on realtime change.
- `useRealtimeReload([{ table: "projects", filter: "id=eq.<id>" }], loadProject)` keeps header/meta fresh.
- `useProjectRole(id)` + `isPMBA(role)` → `canEdit` flag.
- `useProjectAccess(id)` → `{ allowed, loading }`; non-members see a "No access" stub with a back-link.

## Tabs (nested routes)
| Path                  | Label              | Component                          | Visibility |
| --------------------- | ------------------ | ---------------------------------- | ---------- |
| `` (index)            | Tickets            | `ProjectTickets`                   | Always     |
| `change-requests-cr`  | Change Requests    | `ProjectChangeRequestTickets`      | Always     |
| `change-requests`     | Estimate Revisions | `ProjectChangeRequests`            | PMBA only  |
| `sprints`             | Sprints            | `SprintsPage`                      | Always     |
| `health`              | Health             | `ProjectHealth`                    | Always     |
| `client`              | Client             | `ClientPortalEditor`               | PMBA only  |

Tabs are computed in a `useMemo`, filtered by `canEdit`. Active tab gets an underline bar (same pattern as Admin).

## Header
- "All projects" back-link.
- Acronym chip (mono), project name (`font-display`), optional client name, "Vaulted" badge when `is_archived`.
- Right cluster: export icon (PMBA, non-archived) opening `ExportProjectDialog`; `ProjectSettingsDialog` (settings cog — read-only for non-PMBA).

## Archived projects
When `project.is_archived` is true the tab bar and routes are replaced by `<VaultDashboard project={project} />`.

## Edge cases
- Missing `id` → renders nothing.
- Access still loading → renders the normal shell (project header may show "Loading…").
- Access denied → renders the "No access" panel and short-circuits everything else.
