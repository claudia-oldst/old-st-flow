# Fix project team: adding members, role changes and notification toggles

## What I found
- No one has been added to any project since yesterday (the latest was Claudia on Herriot 2). Today's add most likely failed or never finished, and no message said so.
- The Team and Notifications tabs only update after the app reloads the whole member list and the full company team list. The app never shows an error from that reload. So if it's slow or fails, the screen stays out of date. A new person doesn't appear, and their notification switch isn't there to change.
- Changing a role waits for the same full reload before the new role shows, so the dropdown appears to snap back.
- The database permissions look correct: PMBAs can add people, change roles and remove them. The exact failure isn't confirmed yet, so step 1 is to reproduce it.

## Changes
1. **Reproduce first**: sign in as a PMBA in the preview and add, re-role and toggle a test member, recording what the server returns. If this shows a different cause, I'll fix that instead and tell you.
2. **Instant updates**: adding a person, changing a role or removing someone shows on screen immediately. If the save fails, the change is undone and a clear message appears.
3. **New members show up everywhere at once**: someone just added appears straight away on the Notifications tab, switched on by default, and can be toggled.
4. **Busy states**: the Add button and role dropdown lock while saving, so double clicks can't create conflicting changes.
5. **Errors are shown**: if loading the member list fails, a message appears with a Retry option, instead of a silently stale list.
6. Add a test: adding a member or changing a role updates the list immediately and rolls back on failure.

## Technical details
- `useProjectSettings`: optimistic add/update/remove using the `team_members` row already in `allMembers`. On error, roll back and show a toast. `loadMembers` checks both query errors.
- `ProjectTeamTab`: pending state per row and for Add.
- No database changes expected. If reproducing shows a policy problem, I'll explain it and ask before touching the database.
