# Closing-day Slack message to Operations

## What happens
On the day a project's bug-fixing close date arrives, every active Operations user gets a Slack DM containing a ready-to-copy client message, personalised with the project name, the date and their own name:

> Hi,
>
> I'm writing to confirm that our support window for **{project_name}** ends today, **{date}**.
>
> All feedback tickets raised have been addressed and deployed to Production, so there are no pending tickets remaining on our side.
>
> We'd also love to set up a short meeting to catch up soon. Could you let us know what days and times work best for you, and we'll send over an invite?
>
> Best,
> {operations_name}

- A short intro line above it ("Support window for X ends today — here's the client message to send") plus an "Open project" button.
- Sent to all active Operations users regardless of project assignment (same as the 7-day reminder); per-project Slack mutes still apply.
- Directors and PM/BAs do not get this message. The existing 7-day reminder is unchanged.
- Date format: e.g. "Tuesday 24 November 2026".
- Goes out with the daily 07:00 UTC run, only for projects in Bug-Fixing status with a close date of today.

## Technical details
- Supabase change (needs your OK): update `notify_closing_window_due()` to also send a `closing_window_today` event for projects where `closing_window_date = current_date`. No table changes, no data changes.
- `slack-notify`: new `handleClosingWindowToday` handler — loads active Operations team members, builds the message per recipient with their name, DMs via the existing `dm()` helper (which respects project Slack preferences). Then redeploy the function.
