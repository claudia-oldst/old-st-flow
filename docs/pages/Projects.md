# Projects (`/`)

**Source:** `src/pages/Projects.tsx` · **Protected** (wrapped in `RequireAuth`)

## Purpose
Workspace landing page. Lists every project the current user has access to, with search, filter, sort, pagination, and project creation.

## Data
- `useProjectsList({ page, status, sort, debouncedQ })` (`src/features/projects/useProjectsList.ts`) returns `{ projects, total, loading, counts, pageSize, reload }`.
- Counts (`{ tickets, members }`) are fed into `ProjectCard`.

## URL state (`useSearchParams`)
| Param   | Values                            | Default   |
| ------- | --------------------------------- | --------- |
| `q`     | free text (debounced 200ms)        | empty     |
| `status`| `active` \| `archived` \| `all`   | `active`  |
| `sort`  | `newest` \| (other `SortKey`s)    | `newest`  |
| `page`  | integer ≥ 1                        | `1`       |

`setParam` clears `page` when any other param changes.

## Create project dialog
- Inputs: `name` (required) and `acronym` (uppercased, 3–5 letters, regex `/^[A-Z]{3,5}$/`).
- Inserts into `projects` via Supabase. Duplicate acronym → toast `"Acronym \"XXX\" is taken"`.
- On success: toast, close dialog, reset form, reset to page 1, `reload()`.
- Live preview shows `XXX-001`, `XXX-002` once the acronym hits 3 chars.

## Layout
- Header: eyebrow "Workspace", `<h1>Projects</h1>`, subtitle, "New project" button.
- `ProjectsToolbar` (search + status + sort + clear).
- Grid of `ProjectCard` (1/2/3 cols responsive).
- Empty/loading states: skeletons (6) when loading; empty-state card otherwise, with "Clear filters" CTA when filters are active.
- Footer: range label ("Showing N–M of T") + `ListPagination`.
