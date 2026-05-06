## Goal

Add a new **Change Requests** tab between **Tickets** and **Estimate Revisions** in the project workspace. It lists CR-type tickets grouped by epic, with a chart showing how approved CRs grow project scope, and PMBA-only Approve/Reject controls.

## Schema change (migration)

Add CR-approval columns to `tickets`:
- `cr_approval text default 'pending'` — `'pending' | 'approved' | 'rejected'`
- `cr_decided_by uuid` (nullable)
- `cr_decided_at timestamptz` (nullable)

Only CR tickets use these. Non-CR tickets ignore them.

## Routing + nav

`src/pages/ProjectWorkspace.tsx`
- Insert tab `{ to: "change-requests-cr", label: "Change Requests" }` between Tickets and Estimate Revisions (visible to all roles; Approve/Reject gated to PMBA inside).
- Add `<Route path="change-requests-cr" element={<ProjectChangeRequestTickets projectId={id} />} />`.

The existing `change-requests` route stays as Estimate Revisions.

## New feature: `src/features/change-requests/`

**`useProjectCRTickets.ts`** — load + realtime-subscribe CR tickets for the project (joined with status, epic, assignees + member). Returns `{ tickets, loading, reload }`.

**`ProjectChangeRequestTickets.tsx`** — main page:
- Sticky glass toolbar: status filter (Pending/Approved/Rejected, default Pending+Approved), date-range control (`DateRangeControl`, default = project start_date → today, mirroring `ProjectChangeRequests`), and **Add Ticket** button (PMBA only) that opens `AddTicketsDialog` with `defaultType="CR"`.
- Groups CR tickets by `epic_id` (No-epic bucket for nulls), sorted by CR count desc.
- Renders `space-y-3` stack of `EpicCRCard`s — same shell as Estimate Revisions tab.

**`EpicCRCard.tsx`** — collapsible card mirroring `EpicChangeCard` styling:
- Header stats: **Original scope** (sum of original FE+BE+Project across non-CR tickets in the epic), **Approved CR scope** (original + approved CR estimates), **If all approved** (+ pending), **Actual** (logged hours on epic tickets).
- Recharts LineChart (same look as `EpicChangeCard`):
  - `original` — flat baseline.
  - `current` — original + cumulative approved-CR estimates by `cr_decided_at`.
  - `projected` — current + pending CR estimates by `created_at`.
- Table beneath the chart with the requested columns:
  - **Ticket ID** (link to ticket detail), **Ticket** (title), **FE Estimate** (`current_fe_estimate`), **BE Estimate** (`current_be_estimate`), **Date Created**, **Status** (pending/approved/rejected badge), **Actions** (PMBA-only Approve/Reject when pending).
- Approve → `update tickets set cr_approval='approved', cr_decided_by=user.id, cr_decided_at=now()`. Reject mirrors with `'rejected'`. Realtime triggers re-render.

## Add Ticket integration

`src/features/tickets/AddTicketsDialog.tsx`
- Add optional prop `defaultType?: TicketType`; seed `newDraft()` with it. Tickets tab keeps current behaviour (Standard).

## File list

New:
- `src/features/change-requests/useProjectCRTickets.ts`
- `src/features/change-requests/ProjectChangeRequestTickets.tsx`
- `src/features/change-requests/EpicCRCard.tsx`

Edited:
- `src/pages/ProjectWorkspace.tsx`
- `src/features/tickets/AddTicketsDialog.tsx`

Migration:
- Add `cr_approval`, `cr_decided_by`, `cr_decided_at` to `tickets`.

## Out of scope

- No changes to Estimate Revisions tab or `ticket_estimate_changes` table.
- No changes to how CRs appear on the Tickets board/list.
- Health page / Client portal totals not retrofitted to use `cr_approval` in this pass.
