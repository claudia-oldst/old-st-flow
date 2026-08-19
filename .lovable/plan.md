# Stop re-notifying people who were already assigned

## What's happening

The Assign people dialog doesn't add or remove individual people — on Save it deletes **every** assignee on the ticket and re-inserts the full list. The Slack trigger fires on each inserted row, so adding Ryan re-inserts your own existing assignment too, and the bot DMs you "You've been assigned…" for a ticket you were already on. Everyone else already on the ticket gets the same spurious DM.

(The Bulk Assign dialog already computes a minimal diff, so it isn't affected.)

## The fix

Change `src/features/tickets/AssignDialog.tsx` to save a diff instead of wipe-and-replace:

- Compare the dialog's selected FE / BE / Project sets against `current`.
- Delete only the rows that were removed (per ticket + user + slot).
- Insert only the rows that are genuinely new.
- Untouched rows stay in place, so no trigger fires and no DM is sent for them.

Everything else in the dialog stays as-is: the "reset slot status to todo when a slot loses its last assignee" logic, the GitHub repo prompt, and the toast.

## Safety net (optional, recommended)

Add a guard in the assignment path of `supabase/functions/slack-notify/index.ts`: skip the DM when the assignment row's `created_at` shows the same user+ticket+slot pairing already existed — i.e. only notify on a first-time assignment. Simplest version: keep the trigger as-is and rely on the diffed writes; a database-level guard is only needed if other code paths later start replacing assignee sets.

Recommendation: do the diff fix now, no schema change.
