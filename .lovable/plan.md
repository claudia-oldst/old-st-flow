
# Confirm the FE/BE toggle drives discipline on assignment

## Current wiring (already correct)
The FE/BE toggle in `SprintWorkbench` sets `discipline` state (`"FE" | "BE"`), which is passed into `useWorkbenchBulkActions`. On assign, `slot = discipline` is threaded through `addTicketToLane`, which sets `discipline` on the `sprint_tickets` insert. The `discipline` column exists as `NOT NULL` in the DB. All paths that write `sprint_tickets` go through `addTicketToLane`.

On paper this is exactly what you asked for. But you're still seeing `null value in column "discipline"`, so something is escaping this path.

## Steps

### 1. Add a defensive assertion at the single insert point
In `src/features/sprints/dnd.ts`, before the insert, log + toast when `discipline` is not `"FE"` or `"BE"` and abort cleanly instead of hitting Postgres:

```ts
if (discipline !== "FE" && discipline !== "BE") {
  console.error("[addTicketToLane] blocked insert with invalid discipline", { sprintId, ticketId, userId, slot, discipline });
  toast.error(`Cannot assign: toggle discipline was "${discipline ?? "unset"}"`);
  return;
}
```

This turns the raw Postgres error into a message that tells us exactly which slot value produced it — confirming whether the toggle state is the source of the problem or something else is inserting.

### 2. Hard-refresh the app
The current published/preview bundle may predate the `dnd.ts` fix that added the `discipline` column to the insert body. Cmd/Ctrl-Shift-R to force a fresh bundle, then retry assigning a fullstack dev to FE.

### 3. If the error persists after refresh
Follow the console message from step 1. Most likely it will point at a stale caller passing an unexpected slot, and we fix that caller. If no console message appears but the DB error still fires, there's a hidden insert path — I'll grep the whole repo again (including edge functions and any imported package) and thread `discipline` through.

### 4. Remove the temporary log
Once the offending call is fixed, drop the assertion (or downgrade it to a plain early-return without the toast).

## Out of scope
- No changes to the migration, the unique index, or read filtering.
- No changes to the toggle UI itself — its behavior is already correct.
