# Slack DM when an estimate revision is rejected

## What the requester gets
When a PM/BA rejects an estimate revision, the person who requested it gets a short Slack DM from the Pulse bot:

> :x: *Your estimate revision was rejected*
> COU-934 — Ticket title · Project Cousteau
> FE: 4h → 8h
> Rejected by Claudia: <rejection reason>
> [Open ticket]

- No message if the requester rejected their own request, or if they have no linked Slack account.
- The project's Slack notification setting applies, the same as for other Pulse DMs.
- Approvals send no message. Only rejections do.

## Database change (needs your OK)
- Add one new trigger on estimate revisions. It fires only when a revision's status changes from pending to rejected, and it queues a Slack notification the same way the existing "revision requested" alert does.
- No new tables or columns. The reason is read from the text the reject window already saves ("Rejected by NAME: reason"), and the rejector's name comes from the recorded decider.

## Technical details
- Migration: `slack_notify_estimate_rejected_trg()` (SECURITY DEFINER), `AFTER UPDATE OF status ON ticket_estimate_changes`, `WHEN (OLD.status='pending' AND NEW.status='rejected')` → `enqueue_slack_notify({event:'estimate_revision_rejected', change_id})`.
- `slack-notify/index.ts`: new `handleEstimateRejected`. It loads the change, ticket, project, requester (slack_user_id) and decided_by name, pulls the text after the last `Rejected by …:` stamp, and uses the existing `dm()` helper, which respects the project's notification preferences. Routed in the event switch.
- Redeploy slack-notify.
