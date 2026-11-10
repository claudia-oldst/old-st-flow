# Adjust estimate returns to Log time, capped at Approved + Pending

## What changes for the user
1. In the Log time window, entering more hours than are available shows "Adjust estimate" (as today).
2. Submitting the request closes the request window and brings you **back to the Log time window**, with your date, hours and note still filled in. Hours are **no longer logged automatically**.
3. The header updates straight away, e.g. "Used 4h / 6h (+2h pending)".
4. You can log up to **approved + pending** hours. If you still enter more, the "exceeds available" warning and "Adjust estimate" button show again, and Log stays blocked.
5. PMBAs: their request is approved instantly, so the limit simply grows by the approved amount.

The same limit applies where the Log time window is opened from a ticket that is already over its estimate (adjust first, then the Log time window opens).

## Technical details
- `LogTimeModal.tsx` `onSaved`: remove the `handleManualLog({ force: true })` call; just close the adjust dialog and `await refetchCapacity()` so the Log time dialog (still mounted underneath) re-validates. Keep entered values.
- `useLogTime.ts`: keep `wouldOverflowManual` using `capacity.available` (= current estimate + pending deltas from `useTicketCapacity`); drop the `force` bypass so nothing can log past approved + pending.
- `LogTimeWithCapacityCheck.tsx`: unchanged chaining; confirm it refetches capacity before opening Log time.
- Group timer / My Timelogs rows keep the same approved + pending cap (already counted from last change); verify no `force` bypass remains there.
- Update the existing test: after a +2h pending request on a 0h ticket, logging 2h is allowed and 3h is blocked.
