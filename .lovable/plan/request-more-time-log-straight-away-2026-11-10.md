# Request more time → log straight away

## Goal
When you're logging time and ask for more time, the request should show as pending straight away and you should be able to log your hours. Right now the window seems to hang.

## What changes for you
- In the Log time window, if your hours go over the estimate, "Adjust estimate" opens the request form, as it does today.
- When you submit, the request is saved as pending (or applied straight away if you're a PMBA). The window then logs your hours for you and closes, with a message like "Revision submitted for PMBA approval · 2h logged".
- The "Used X / Y (+Zh pending)" line updates right away, without waiting for a reload.
- The same applies to the Start/Stop group timer and the inline rows on My Timelogs, which use the same over-estimate step.

## Steps
1. Reproduce it in the preview as a developer on a 0h ticket and on an over-estimate ticket. Confirm where it gets stuck. My guess is that the window keeps showing "Adjust estimate" until the pending figures reload, and that the reload waits for two stacked windows.
2. Pass the requested extra hours back when the request form saves. Add them to the pending figure in the Log time window straight away, then reload the real numbers in the background.
3. After a successful request, log the hours that were entered automatically. Close both windows and show one combined message.
4. If logging fails after the request was saved, keep the window open with the hours still filled in and show the error. The request stays pending.
5. Add the same "add pending straight away, then continue" step to the group timer and My Timelogs over-estimate flows.

## Technical details
- `RequestMoreTimeDialog`: `onSaved(delta, slot, applied: boolean)`.
- `useLogTime`: keep a local `optimisticPending` value that is added to `capacity.available`. Clear it after `refetchCapacity` finishes. Add `logAfterAdjust()`, which calls the existing manual-log path and skips the overflow check once.
- `useStopGroup` / `useInlineLogDraft`: same pattern for each row.
- Test: after a pending revision of +Nh on a 0h ticket, `wouldOverflowManual(N)` is false.
