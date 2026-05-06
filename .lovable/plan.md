## Goal

Give clients (via `/h/:hash`) a second tab in their portal called **Change Requests**, mirroring the PMBA "Change Requests" tab (`ProjectChangeRequestTickets`). Clients can approve CRs and click into a ticket to read its Acceptance Criteria. The same view is rendered inside the PMBA `ClientPortalEditor` preview so PMBA sees exactly what the client sees.

## UX

- `/h/:hash` and `ClientPortalEditor` preview wrap their content in a `Tabs` with two triggers: **Summary** (current `PortalView`) and **Change Requests**.
- Change Requests tab reuses `EpicCRCard` exactly as on the PMBA tab — same per-epic card, totals, chart, ticket table — with `canReview={true}` for clients and a hash-aware `onApprove`. **Reject is hidden** for clients (only Approve, per spec).
- Clicking a ticket row opens a read-only side sheet that shows **only the Acceptance Criteria** (rendered as markdown via the same `react-markdown` + `remark-gfm` setup used in `TicketDetailSheet`). The sheet header shows `formatted_id` + title only — **no Ticket Detail tab**, no estimates, no status, no edit affordances. If acceptance criteria is empty, show "No acceptance criteria yet." Used on both the public route and the PMBA preview so behaviour matches.
- Filters/date-range from `ProjectChangeRequestTickets` are not shown to the client — they always see all CRs within the project's published cutoff window. Default status filter mirrors PMBA: `["pending", "approved"]`.

## Backend (Supabase)

Migration adds two RPCs (both `security definer`, gated on a valid `client_portal_hash`):

1. `get_client_portal_change_requests(_hash text)` → returns:
   ```
   {
     project: { id, acronym, name },
     epics: [{ id, epic_name }],
     baseline_tickets: [...non-CR tickets with original/current estimates + actuals...],
     cr_tickets: [...CR tickets with acceptance_criteria, current_fe/be/project estimates, cr_approval, cr_decided_at, created_at, epic_id, formatted_id, title...]
   }
   ```
   Returns `null` if hash missing/disabled. No auth required.
2. `client_approve_cr(_hash text, _ticket_id uuid)` → atomically sets `cr_approval='approved'`, `cr_decided_at=now()`, `cr_decided_by=null` only when ticket's project matches the hash and `cr_approval='pending'`. Returns boolean.

No schema changes — `tickets.cr_approval`, `cr_decided_at`, `cr_decided_by` already exist. RLS on `tickets` unchanged; clients only access via these RPCs.

## Frontend changes

- **New** `src/features/client-portal/PortalChangeRequests.tsx`
  - Renders the per-epic `EpicCRCard` list like `ProjectChangeRequestTickets`, hiding date-range and "Add Ticket" controls. Default range spans all CRs.
  - Hides Reject by passing a new optional `hideReject` prop on `EpicCRCard` (additive change; PMBA tab unchanged).
  - `onOpenTicket` opens the read-only acceptance-criteria sheet.

- **New** `src/features/client-portal/ClientTicketSheet.tsx`
  - Minimal `Sheet` containing: header (`formatted_id` + title) and one section — Acceptance Criteria rendered as markdown (read-only). Nothing else.

- **New** `src/features/client-portal/useClientPortalCRs.ts`
  - `useClientPortalCRsByHash(hash)` → calls `get_client_portal_change_requests`; subscribes to realtime on `tickets` for that project.
  - PMBA preview reuses existing `useProjectTickets` + `useProjectEpics` already loaded in `ClientPortalEditor`.

- **Edit** `src/pages/ClientPortalPublic.tsx`
  - Wrap content in `Tabs`: Summary (`PortalView`) | Change Requests (`PortalChangeRequests` fed by hash hook). Approve handler calls `client_approve_cr`, then refresh.

- **Edit** `src/features/client-portal/ClientPortalEditor.tsx`
  - In the right-hand "Client preview" pane, wrap `PortalView` in the same `Tabs`. Change Requests tab uses already-fetched `tickets`/`epics`. Approve handler uses the existing authenticated update PMBA already uses.

- **Edit** `src/features/change-requests/EpicCRCard.tsx`
  - Add optional `hideReject?: boolean`. When true, render only the Approve button in the actions cell.

## Reuse summary

- `EpicCRCard` — reused (one optional prop).
- `MultiSelectFilter` — reused for status filter.
- `Tabs`, `Sheet` — reused.
- Markdown rendering pattern — copied from `TicketDetailSheet`'s `AcceptanceCriteria` (read-only branch).
- `PortalView` — unchanged.

## Out of scope

- Client cannot reject CRs.
- Client ticket sheet shows only Acceptance Criteria — no Ticket Detail tab, no estimates/status/comments.
