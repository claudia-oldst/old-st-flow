# Why Epic 174 (Client & Campaign Hierarchy) shows 0h current

## What the data says

The epic itself is fine at ticket level: 9 tickets, original 24h, current 18.5h, actual 18.5h.

The 0h only appears in Estimate Evolution / the epic trend chart, because that view does not read the tickets' current estimates. It rebuilds current as:

```text
current = sum(original estimates) + sum(approved estimate-change deltas)
```

For epic 174 that is 24h + (-64.25h) = -40.25h, and the chart clamps negatives to 0.

The -64.25h comes almost entirely from one ticket, DRA-047:

| Ticket | Approved deltas | Ticket original now |
| --- | --- | --- |
| DRA-008 | -1.5 FE, -2.5 BE | 4 / 6 (consistent) |
| DRA-009 | -0.75 FE, -0.75 BE | 2 / 3 (consistent) |
| DRA-047 | -29.5 FE, -29.25 BE | 0.5 / 0.75 (inconsistent) |

DRA-047 was auto-snapped at Dev Done from 30h/30h down to 0.5h/0.75h, but its stored *original* estimate is now 0.5/0.75 rather than 30/30. So the 29h drop is counted twice: once because the original baseline is already the low number, and again as a delta. Result: a large negative that wipes out the whole epic.

## Fix

1. Correct the DRA-047 record so baseline and history agree. Preferred: restore its original estimates to 30 FE / 30 BE (the true pre-snap baseline), leaving the approved -29.5 / -29.25 deltas to carry it to the current 0.5 / 0.75. This makes the epic read original 83h, current 18.5h.
2. Audit the rest of the database for the same mismatch — any ticket where `original - sum(approved deltas) != current` — and report them before changing anything else. Same-cause rows get the same correction; anything else gets flagged for your call.
3. Harden the trend maths so one bad row cannot zero out an epic: clamp per ticket rather than per epic, and skip deltas whose implied baseline contradicts the ticket's stored original.

## Technical notes

- Reading side: `src/features/_shared/estimate-trend/fetchTrendData.ts` (approved-only deltas) and `src/features/health/estimate-evolution/buildEpicSnapshots.ts` / `buildTrendSeries.ts` (where the clamp to 0 happens).
- Writing side: the snap is produced by the `snap_estimates_on_dev_done` trigger; the audit in step 2 will show whether the trigger, or a later manual edit of the originals, produced the mismatch. If the trigger is at fault it gets fixed in the same pass.
- Step 1 and 2 are data corrections (SQL), step 3 is frontend only.
