Single-ticket overflow should auto-open the Request More Time dialog

When logging time against a single ticket and the entered duration exceeds the available estimate, the inline row currently only shows a small warning with an Adjust button. The group-timer flow already opens the estimate-revision dialog automatically when a ticket overflows. Bring the same behaviour to the single-ticket path.

Technical changes

1. `src/features/timelog/my-timelogs/useInlineLogDraft.ts`
   - In `save()`, when `overflowingRowIds.length > 0` and only one ticket is selected, call `setAdjustTicketId(overflowingRowIds[0])` and return early instead of (or in addition to) the toast.
   - Keep the existing capacity/refetch plumbing unchanged.

2. `src/features/timelog/my-timelogs/InlineLogRow.tsx`
   - Ensure the `RequestMoreTimeDialog` is still rendered for single-ticket overflow via `adjustTicketId`.
   - Keep the inline overflow banner as supporting context.

No database or RLS changes are required.
