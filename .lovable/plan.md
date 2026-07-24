## Add "Version" field to Add Tickets modal

Let PMBAs set a version per row when bulk-adding tickets, matching the existing version field on the ticket detail sheet.

### Changes

1. **`src/features/tickets/add-dialog/types.ts`**
   - Add `version: string` to `Draft`; default `""` in `newDraft`.

2. **`src/features/tickets/add-dialog/DraftRow.tsx`**
   - Add a compact `Input` (placeholder "Version") in the grid alongside FE/BE/Proj. Rebalance column spans so the row still fits on one line at `md`.

3. **`src/features/tickets/add-dialog/useDraftRows.ts`**
   - Include `version: d.version.trim() || null` in the insert payload for each ticket.

No schema changes — `tickets.version` already exists and is validated (max 50 chars) via `ticketInputSchema`.
