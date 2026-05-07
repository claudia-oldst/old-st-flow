## Goal
Eliminate the legacy single-ticket timer fallback in `TimerSync.tsx` so there is exactly one source of truth (`active_timer_tickets`) for "what is being timed", without losing any in-flight legacy timers.

## Approach: self-healing backfill
Replace the read-time fallback (lines 75–95) with a one-time per-user backfill: if `TimerSync` finds an `active_timers` row with no matching `active_timer_tickets` row, it `upsert`s the missing group row, then renders via the standard path. Every subsequent load — for that user and everyone else — hits one code path.

## Change (one file)

`src/components/TimerSync.tsx` — replace the `// Fallback for legacy single-ticket timers` block with:

```ts
// Self-heal: backfill missing group row for any pre-migration
// active_timers row, then take the single normal path.
if (tickets.length === 0 && active.ticket_id) {
  await supabase
    .from("active_timer_tickets")
    .upsert(
      { user_id: user.id, ticket_id: active.ticket_id, position: 0 },
      { onConflict: "user_id,ticket_id" },
    );

  const { data: t } = await supabase
    .from("tickets")
    .select("id, formatted_id, title, fe_status, be_status, status_id, project_id")
    .eq("id", active.ticket_id)
    .maybeSingle();
  if (!mounted) return;
  if (t) {
    tickets = [{
      id: t.id, formatted_id: t.formatted_id, title: t.title, position: 0,
      fe_status: t.fe_status as any, be_status: t.be_status as any,
      status_id: t.status_id, project_id: t.project_id,
    }];
  }
}
```

## Guardrails
- No DB schema change, no migration. RLS on `active_timer_tickets` already permits inserts.
- No changes to `startTicketTimer.ts`, `LogTimeModal.tsx`, `Start/StopGroupTimerDialog.tsx`, the timer store, or any UI.
- If upsert fails, behavior degrades to today's (UI still shows the ticket from `active.ticket_id`) — never worse than current.
- `tsc` passes; no new types or deps.

## Verification
1. Normal post-migration timer: backfill branch is skipped; UI unchanged.
2. Simulated legacy row (`active_timers` only): on next load, group row is written, UI renders the ticket, refresh hits the normal path with no extra writes.
3. `StopGroupTimerDialog` still clears both tables — no orphans.

## Out of scope
- Dropping `active_timers.ticket_id` or merging the two tables (separate follow-up).