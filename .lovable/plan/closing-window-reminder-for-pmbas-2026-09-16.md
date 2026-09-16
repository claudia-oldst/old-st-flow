# Closing window reminder for PMBAs

One week before a project's bug-fixing closing window date, each PMBA on that project gets a Slack DM reminding them the window is about to close.

## Behaviour

- A daily check runs each morning and looks for projects whose closing window date is exactly 7 days away.
- Only projects in the Bug-Fixing stage are considered (that's where the closing window applies).
- Everyone with the PMBA role who is a member of that project gets a direct message; people who muted notifications for that project are skipped, exactly like existing reminders.
- It goes out once. There are no repeat nudges as the date gets closer.

## The message

> :warning: *Closing window approaching* — [Project name] closes on Tue 23 Sep (7 days).
> Wrap up any outstanding bug fixes before the window closes.
> [Open project]

## Technical notes

- New event `closing_window_reminder` in the `slack-notify` edge function, taking a `project_id`. It loads the project, finds project members with role `PMBA`, and DMs each via the existing `dm()` helper (so mute preferences and Slack-id resolution are reused). Message uses the same block/button style as the estimate-revision handler.
- New database function `public.notify_closing_window_due()` selecting projects where `lifecycle_status = 'Bug-Fixing'` and `closing_window_date = current_date + 7`, calling the existing `public.enqueue_slack_notify()` for each. Reuses the configured notify URL/secret in `app_settings`.
- Scheduled with `pg_cron` once a day at 07:00 UTC — this is genuinely time-based (there is no row change on the day the reminder is due), and once daily is the lowest cadence that meets a "one week before" requirement. Worst-case delivery delay is under a day.
- Matching on an exact date means one reminder per project with no dedupe table needed.
- Docs: note the reminder in `docs/pages/project-settings-dialog.md`.

## Not included

- Reminders for projects in Monitor (which also shows a closing window field) — say the word and I'll include them.
