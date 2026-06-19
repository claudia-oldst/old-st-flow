# Client Portal Public (`/h/:hash`)

**Source:** `src/pages/ClientPortalPublic.tsx` · **Public route** (no auth gate)

## Purpose
External-facing, hash-addressed view of a project's client portal. Clients see the timeline, scope summary, and change requests; they can approve CRs without signing in.

## Data
- `usePublicPortal(hash)` → `supabase.rpc("get_client_portal", { _hash })` → `PortalPayload` (`{ project, epics, ... }`). Refreshes via realtime invalidation on dependent tables.
- `useClientPortalCRsByHash(hash)` → CR baseline + CR tickets, with `refresh()`.
- `useEpicDiscounts(project.id)` → discount list for the Summary tab.

## CR approval
`handleApprove(ticketId)` calls `supabase.rpc("client_approve_cr", { _hash, _ticket_id })`. On success toasts and refreshes the CR list. On error/false result toasts "Could not approve".

## Layout
- Header bar: `oldst-logo.png` only (no nav).
- Three-tab body (default `timeline`):
  - **Timeline** — `<SprintGanttOrEmpty projectId={data.project.id} />`
  - **Summary** — `<PortalView payload={data} showRate discounts={discounts} />`
  - **Change Requests** — `<PortalChangeRequests acronym epics baselineTickets crTickets ratePerHour onApprove={handleApprove} />`. Renders "Loading…" until `crData` resolves.

## States
- `loading` → centered "Loading…".
- `error || !data` → "This portal isn't available."
- Page width: `max-w-[1280px]` (`2xl:max-w-[1440px]`), matching the rest of the app shell.
