## Goal

When a PMBA rejects an Estimate Revision in `ProjectChangeRequests`, require a rejection reason. Append that reason to the existing `reason` field on `ticket_estimate_changes` (so the original requester's reason is preserved with the rejection note appended). Also fix the toast wording to say "Estimate Revision".

## Changes

### 1. New dialog: `src/features/estimates/RejectEstimateRevisionDialog.tsx`

Small controlled `Dialog` component:
- Props: `open`, `onOpenChange`, `originalReason` (string | null), `onConfirm(rejectionReason: string)`, `busy`.
- Shows the original reason (read-only, dimmed) for context.
- Textarea labeled "Rejection reason" — required, min 1 char after trim.
- Buttons: "Cancel" and "Reject estimate revision" (destructive variant). Confirm disabled until reason is non-empty.

### 2. `src/features/estimates/ProjectChangeRequests.tsx`

- Add state: `rejectTarget: ChangeRow | null` and `rejectBusy: boolean`.
- Replace `handleReject` so clicking Reject opens the dialog instead of immediately updating.
- New `confirmReject(rejectionReason: string)` performs the existing update plus:
  - Builds `combinedReason`:
    ```ts
    const base = (row.reason ?? "").trim();
    const stamp = `Rejected by ${user.name}: ${rejectionReason.trim()}`;
    const combinedReason = base ? `${base}\n\n— ${stamp}` : `— ${stamp}`;
    ```
  - Updates row with `{ status: "rejected", decided_by, decided_at, reason: combinedReason }`.
- Change success toast from `"Change request rejected"` → `"Estimate revision rejected"`.
- Change approval toast from `"Change request approved"` → `"Estimate revision approved"` for consistency with the user's terminology directive.
- Render `<RejectEstimateRevisionDialog>` at the bottom of the component.

### 3. RLS / schema

`ticket_estimate_changes.reason` is already nullable text and editable by PMBAs (existing reject update already writes to that table). No migration needed.

### Out of scope

- `src/features/change-requests/ProjectChangeRequestTickets.tsx` — that handles CR tickets (`cr_approval`), not estimate revisions. Untouched.
- Portal view passes `hideReject` and a noop, so no change needed there.

## Verification

- As a PMBA, open Project → Estimate Revisions → click Reject on a pending row.
- Dialog opens showing the original reason; confirm button disabled until text is entered.
- After confirm: row moves to Rejected, the appended `— Rejected by <name>: <text>` is visible in the row's reason field, toast reads "Estimate revision rejected".
- Approve action toast reads "Estimate revision approved".
