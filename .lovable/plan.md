## Goal

One realtime subscription pattern across the app. No loss of immediacy — updates still feel instant.

## Scope of duplication today

- `src/hooks/useRealtimeReload.ts` — the canonical hook. Already used by `useTicketComments`, `useTicketTimeLogs`, `useClientPortalCRsByHash`.
- `src/features/tickets/useProjectTickets.ts` (lines ~110–125) — builds its own `supabase.channel(...)` inline for `tickets`, `ticket_assignees`, `project_epics`.
- `src/components/TimerSync.tsx` (lines ~107–123) — builds its own channel for `active_timers` + `active_timer_tickets`.
- `src/features/statuses/useStatuses.ts` — also rolls its own channel for `statuses`.

All three inline versions do the same thing as `useRealtimeReload` but with drift: different channel-name schemes, no `enabled` flag, no JSON-keyed dep, ad-hoc cleanup.

## Plan

### 1. Migrate the three inline subscriptions to `useRealtimeReload`

**`src/features/tickets/useProjectTickets.ts`**
- Delete the inline `useEffect` that creates `tickets-${projectId}-...` channel.
- Replace with:
  ```ts
  useRealtimeReload(
    projectId
      ? [
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_assignees" },
          { table: "project_epics", filter: `project_id=eq.${projectId}` },
        ]
      : null,
    load,
    !!projectId,
  );
  ```
- `load` is already `useCallback`-stable.

**`src/components/TimerSync.tsx`**
- Replace the inline channel block (lines ~107–123) with two `useRealtimeReload` calls (or one with both tables) keyed on `user.id`.
- Move `load` out of the `useEffect` and wrap in `useCallback` so it can be passed to the hook.

**`src/features/statuses/useStatuses.ts`**
- Replace its inline channel with `useRealtimeReload([{ table: "statuses" }], load)`.
- Wrap `load` in `useCallback`.

After these edits, `supabase.channel(...)` for postgres-changes lives in exactly one file.

### 2. Make `useRealtimeReload` slightly smarter (no API change)

Keep the "subscribe → reload" contract — it's simple, used everywhere, and matches what the user wants ("immediate, quick"). But add one small maintainability win in the single shared file:

- **Coalesce burst events**: if multiple `postgres_changes` arrive within ~50 ms (e.g. a multi-row update or two filters firing for the same write), call `onChange` once via a microtask/`setTimeout(…, 50)` debounce. This actually makes realtime feel *faster* under load (fewer redundant fetches racing each other) while still being effectively instant to the user.
- The hook's signature, callers, and behavior on a single event are unchanged.

**Explicitly NOT doing** delta/patching from `payload.new`/`payload.old`. That would require per-caller reducers and is the opposite of "maintainability". It's noted as a future optimisation but is out of scope here — the user's stated priority is maintainability + immediacy, not bandwidth.

### 3. Verify no behaviour regressions

- `tsc` clean.
- ProjectTickets list/board still updates on ticket edits, assignee changes, epic renames.
- TimerSync still flips active timer state across tabs/devices.
- Statuses admin still reflects new/edited statuses live.
- Comments, time logs, client-portal CRs unaffected (already on the hook).

## Out of scope

- Switching to delta updates from realtime payloads (separate perf task).
- Adding `supabase_realtime` publication SQL — these tables are already publishing (current inline subscriptions work today).
- Any DB / RLS / migration changes.

## Files touched

- `src/hooks/useRealtimeReload.ts` — add ~50 ms coalescing.
- `src/features/tickets/useProjectTickets.ts` — drop inline channel, use hook.
- `src/components/TimerSync.tsx` — drop inline channel, use hook (extract `load` to `useCallback`).
- `src/features/statuses/useStatuses.ts` — drop inline channel, use hook.
