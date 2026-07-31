# Fix: public portal Timeline is empty for clients

## What's happening

The public portal page (`/h/:hash`) renders the Timeline tab with the same Gantt component the internal app uses. That component reads the `sprints`, `sprint_tickets`, `tickets` and `project_epics` tables directly from the browser.

Confirmed in the database: every SELECT policy on those four tables is granted to the `authenticated` role only, and each one requires the caller to be a PMBA or a member of the project. A client in incognito is anonymous, so all four queries return zero rows — no error, just empty — and the Gantt falls through to "No sprint timeline available yet."

Everything else on the portal (Summary, Change Requests) works because it goes through hash-scoped security-definer RPCs (`get_client_portal`, etc.), which bypass RLS after validating the hash. The Timeline is the one tab that never got that treatment.

## The fix

Give the Timeline the same hash-gated RPC treatment as the other tabs.

1. **New database function** `get_client_portal_gantt(_hash text)` — security definer, granted to `anon`. It hashes the incoming token, matches it against the project's stored portal hash, and returns `null` if there is no match or the portal is disabled (same guard as `get_client_portal`). On a match it returns a single JSON payload with everything the Gantt needs: sprints (number, start/end dates), epics (name, order), and per-epic/per-sprint committed vs done counts for FE and BE, respecting the project's `client_visibility_cutoff` where the existing portal RPCs do.

2. **New read hook + portal Gantt view** — a `usePublicPortalGantt(hash)` hook calling that RPC, and a presentational Gantt that renders the returned rows. The existing internal Gantt visual (epic rows on the y-axis, sprints on the x-axis, segmented committed → done bars, dashed "Today" marker, hover tooltips) is reused so the client sees the same chart; only the data source changes.

3. **Wire it into `ClientPortalPublic.tsx`** — the Timeline tab uses the hash-based component instead of `SprintGanttOrEmpty`. The PMBA-side portal editor preview keeps using the current authenticated component, so nothing changes for internal users.

4. **Genuine empty state preserved** — if the project truly has no sprints, the RPC returns an empty sprint list and the tab still shows "No sprint timeline available yet."

## Technical notes

- No RLS policies are loosened. `anon` gets nothing beyond EXECUTE on the new security-definer function, which is gated on the portal hash exactly like `get_client_portal`.
- Realtime invalidation on the public portal stays keyed off the payload's project id, matching how `usePublicPortal` already works.

## Verification

Load the published `/h/:hash` URL in a fresh incognito-equivalent browser context (no Supabase session) and confirm the Timeline tab renders sprint bars rather than the empty message, with no 401/permission errors in the console.
