# Add Operations and Director roles

## What you will see
- Admin > Team and project team role pickers offer two new roles: **Operations** and **Director**.
- Anyone with either role can do everything a PM/BA can today: Admin pages, original estimates, approving revisions and CRs, converting Feedback, client billing/emails, sprint planning, seeing all projects, and receiving PM/BA Slack alerts (e.g. bug-fixing close reminders, feedback alerts).
- Their role label still shows as Operations or Director, so they can be given different rights later without another rework.
- Non-PM/BA users still can't pick these roles for themselves in My profile.

## Database change (needs your OK when I build)
- Add `Operations` and `Director` to the team role list.
- Update the role sync so both roles get the same PM/BA permission entry used by every existing database permission check. No existing person's role, data or permissions change, and no Slack messages are sent.

## App changes
- One shared "has PM/BA rights" check (PMBA, Operations, Director) replacing the ~12 places that test for "PMBA" directly (Admin, access guard, projects list, quick switcher, top bar, time logging, estimates, profile dialog, project role hooks).
- Slack PM/BA recipient lookups use the same check.
- Role badges get labels/colours for the new roles.
- Small test confirming Operations and Director have PM/BA rights and others don't.

## Later customisation
When you want them to differ, we change only the shared check (app) and, if needed, give them their own database permission entry.
