
# PMBA Change Requests review

A new global page that lets PMBAs see all `ticket_estimate_changes` across all projects, broken down by epic with an evolution graph per epic, filterable by **status** (multi-select) and **requesting user** (multi-select). Clicking an epic expands the underlying change requests with original/new/reason and (for `pending` rows) Approve / Reject buttons. Only `approved` requests are reflected in the ticket's `current_*_estimate`.

## Behavior

1. Top-level filters (multi-select, AND between groups, OR within a group):
   - **Status**: `pending`, `approved`, `rejected` — defaults to `pending` so PMBAs land on actionable items.
   - **Requester**: any team member who has ever filed a change. Defaults to all.
   - Optional **Project** multi-select so PMBAs can scope to one or more projects (it's a global page).
2. Below the filters, a list of **epic cards**. Only epics that contain at least one ticket with a change request matching the filters appear.
3. Each epic card shows:
   - Epic name + project acronym, ticket count, and a totals strip (Original / Current-with-approved-only / Current-if-all-approved / Actual).
   - The same mini evolution graph used on Health (Original dashed, Current solid, Actual solid). The "Current" line only includes deltas from changes that match the selected status filter — so if the PMBA filters by `pending`, they immediately see the projected impact of approving everything pending.
4. Clicking an epic card expands to a table of the matching `ticket_estimate_changes`, newest first:
   - Columns: Ticket (linked formatted_id), Discipline, Previous, New, Δ, Reason, Requester (avatar+name), Requested at, Status badge, Actions.
   - For rows with `status='pending'`, show **Approve** and **Reject** buttons inline.
5. Approving a pending row:
   - Sets `status='approved'`, `decided_by=current user`, `decided_at=now()`.
   - Updates the corresponding ticket's `current_fe_estimate` / `current_be_estimate` / `current_project_estimate` by adding the row's `delta` (matches the existing approved-row semantics).
6. Rejecting:
   - Sets `status='rejected'`, `decided_by=current user`, `decided_at=now()`. Ticket estimates are not touched.
7. Existing flows that already insert `status='approved'` directly (PMBA "Adjust estimate" dialog, the auto-trim trigger) keep working unchanged — those rows just appear with the `approved` badge and no action buttons.

## Surfacing

- New top-bar nav item **"Change Requests"** (PMBA-only — hidden via `useProjectRole` global fallback when the current user's `team_members.role !== 'PMBA'`).
- New route: `/change-requests` → `src/pages/ChangeRequests.tsx`.

## Technical implementation

**1. Hook — `src/features/estimates/useAllEstimateChanges.ts`** (new)
- Fetches `ticket_estimate_changes` joined with `tickets!inner(id, formatted_id, project_id, epic_id, original_fe_estimate, original_be_estimate, original_project_estimate, current_fe_estimate, current_be_estimate, current_project_estimate, actual_frontend_hours, actual_backend_hours, actual_project_hours)` and the requester via `team_members(name, avatar_color)`. Realtime subscription on `ticket_estimate_changes` to refresh.
- Also exposes `projects` and `epics` lookups (lightweight queries) so the page can render names without N+1.

**2. Page — `src/pages/ChangeRequests.tsx`** (new)
```text
ChangeRequests
├── FiltersBar  (Status multi-select, Requester multi-select, Project multi-select)
├── For each epic group (filtered):
│   └── EpicChangeCard
│       ├── Header: project acronym · epic name · counts · totals
│       ├── Mini chart (recharts LineChart, 80–120px tall) with the same
│       │     three series as EstimateEvolution but the "Current" line
│       │     applies deltas from changes whose status matches the active
│       │     status filter (pending → preview, approved → real current).
│       └── Collapsible: table of matching changes with Approve/Reject
└── Empty-state when no epics match.
```
Reuse `MemberAvatar`, the `Collapsible` primitive, and the existing `formatHours` / `healthRatio` helpers. Multi-select is built with `Popover` + `Checkbox` (no new dep needed — pattern already used elsewhere for compact filter chips; if not, fall back to a plain dropdown of toggles inside a `Popover`).

**3. Approve / reject actions** — inline in the table, calling Supabase from the page:
```text
approve(row):
  update ticket_estimate_changes set status='approved', decided_by=user, decided_at=now() where id=row.id
  update tickets
    set current_fe_estimate = current_fe_estimate + (row.discipline='FE' ? row.delta : 0),
        current_be_estimate = current_be_estimate + (row.discipline='BE' ? row.delta : 0),
        current_project_estimate = current_project_estimate + (row.discipline='Project' ? row.delta : 0)
    where id = row.ticket_id
reject(row):
  update ticket_estimate_changes set status='rejected', decided_by=user, decided_at=now() where id=row.id
```
Both wrapped in `toast.promise` for feedback, then the realtime subscription refreshes the view.

**4. Nav** — add the item to `TopBar.tsx`. Visibility: read the current user's global `role` from the store; only render when `role === 'PMBA'`. Route guard inside `ChangeRequests.tsx` shows a friendly "PMBA only" message otherwise.

**5. Defaults & UX**
- Status filter defaults to `['pending']`.
- Requester defaults to all selected.
- Sticky filter bar; epic cards are collapsed by default; toggle "Expand all" button.
- Status badges use existing health palette (pending=warn, approved=good, rejected=dim).

## Files touched / created

- **New**: `src/pages/ChangeRequests.tsx`
- **New**: `src/features/estimates/useAllEstimateChanges.ts`
- **New**: `src/features/estimates/EpicChangeCard.tsx` (epic header + mini chart + table)
- **New**: `src/features/estimates/ChangeRequestsFilters.tsx` (multi-select chips)
- **Edited**: `src/components/TopBar.tsx` (PMBA-only "Change Requests" nav item)
- **Edited**: `src/App.tsx` (add `/change-requests` route)

## Edge cases

- A change request whose ticket has been deleted: the inner join drops it (acceptable — orphaned).
- Tickets with no epic: grouped under a synthetic "No epic" bucket per project so they're still visible.
- Approving the same row twice: idempotency guarded by `WHERE status = 'pending'` in the approve update; a second click no-ops with a toast.
- Auto-trim entries (`reason LIKE 'Auto-trimmed%'`) are inserted as `approved` so they only show when the `approved` filter is on, with a small "auto" badge — no Approve/Reject buttons.
- The existing `RequestMoreTimeDialog` currently writes rows as `status='approved'` directly. To make the new pending-flow useful, a separate small follow-up could let non-PMBAs file `status='pending'` instead — out of scope for this task but flagged.
