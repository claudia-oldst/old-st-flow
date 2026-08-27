# Add all team members to Old St Internal, with Slack notifications off

## Current state
- Project: Old St Internal (OSL).
- It currently has exactly one project member: Benna (PMBA).
- There are 42 rows in the team roster, including a "Userback" system account used for automated feedback tickets.
- No notification preference rows exist for this project, so members currently fall back to the default (notifications on).

## What will change
- Every real team member (41 people) is added to Old St Internal using their default workspace role (Frontend, Backend, Fullstack, QA, PMBA, Design).
- Benna stays as-is (already a member, no duplicate).
- The "Userback" system account is skipped — it is not a person.
- A Slack notification preference row is created for every member of this project with notifications switched off. This applies to Old St Internal only; their settings on other projects are untouched.

## Technical notes
- Two data statements via the run_sql tool (no schema or code changes):
  - Insert into `project_members` selecting from `team_members` (role copied from `team_members.role`), excluding the Userback account, with `on conflict do nothing`.
  - Insert into `project_notification_prefs` with `slack_enabled = false` for every member of the project, `on conflict` updating `slack_enabled` to false.
- No migration, RLS, or frontend changes required.
