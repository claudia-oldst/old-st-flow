## Root cause (confirmed)

`src/features/timelog/log-time/useLogTime.ts` line 113-114:

```ts
const wouldOverflowManual = (h: number) =>
  capacity.available > 0 && capacity.actual + h > capacity.available + 1e-6;
```

The `capacity.available > 0` short-circuit means when a discipline's current estimate is **0h**, the overflow check is skipped entirely and any log is accepted. So for DRA-003 with BE estimate = 0h, Julian's manual log (and any timer stop) went straight through.

`capacityFor` (`useTicketCapacity.ts`) already models this as `isOver` when `available === 0 && actual > 0`, but the log-time guard doesn't consult it.

Stop-group and start-group timer paths use the same `n()`/`capacityFor` shape — worth checking they don't have the same 0-estimate bypass.

## Fix plan

1. In `useLogTime.ts`, change `wouldOverflowManual` so 0-estimate is treated as "no available capacity", not "unlimited":
   - Block when `capacity.available <= 0` (nothing budgeted) **or** `capacity.actual + h > capacity.available + 1e-6`.
   - Error message stays "Adjust the estimate first — this would exceed available hours."
2. Audit and align the two timer paths so a 0-estimate discipline can't be started/stopped without an estimate bump:
   - `src/features/timelog/StartGroupTimerDialog.tsx` — block start when `available <= 0`.
   - `src/features/timelog/stop-group/useStopGroup.ts` + `RowsList.tsx` — surface the same guard on stop so the elapsed hours can't silently overflow.
   - Single-ticket timer stop path (wherever `active_timers` closes into `time_logs`) — verify it uses the same guard; extend if not.
3. Leave `RequestMoreTimeDialog` as the escape hatch (devs submit a pending revision, PMBA auto-approves).

## Not in scope
- No DB / RPC / policy changes.
- No change to how estimates are captured on ticket creation.
- Existing over-logged entries on DRA-003 stay as-is (this is a going-forward guard). If you want them retroactively flagged or reversed, say so and I'll add a follow-up.

## Verification
- Manual log 0.5h on a 0h-BE ticket → blocked with toast.
- Bump BE to 2h via Adjust estimate → log succeeds up to 2h, blocks past.
- Timer start on 0h discipline → blocked (or allowed only if paired with an estimate bump, matching manual behaviour — confirm which you prefer).
