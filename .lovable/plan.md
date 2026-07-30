## Goal
Send immediate Slack DMs when (A) someone is newly assigned to a ticket slot, and (B) a pending estimate revision is created — one DM per PMBA on that project. Notifications can be switched on/off globally per user **and** per project per member. Slack failures never break the underlying save.

## 1. Migration (new file)
- `team_members`: add `slack_user_id text`, `slack_notifications_enabled boolean not null default true` (global opt-out).
- `project_members`: add `slack_notifications_enabled boolean not null default true` (per-project opt-out).
- RLS: a member can update their own row's flag on both tables; PMBAs on a project can update the per-project flag for any member of that project. `slack_user_id` is written only by the edge function via service role.

## 2. Secrets
- `SLACK_BOT_TOKEN` (you add it) and `APP_BASE_URL` for deep links. Existing `chat:write` + `users:read.email` scopes are sufficient.

## 3. Shared helper `supabase/functions/_shared/slack.ts`
- `isNotifiable(admin, teamMemberId, projectId)` — true only when the global flag and the member's `project_members` flag for that project are both true.
- `getOrLookupSlackUserId(admin, teamMemberId)` — reads `slack_user_id`/`email`; on missing id calls `users.lookupByEmail`, persists it, returns id; logs and returns `null` on failure.
- `sendSlackDM(slackUserId, blocks, fallbackText)` — `chat.postMessage`, checks HTTP status and Slack's `ok` field, logs failures, never throws.

## 4. Edge function `notify-slack-assignment`
- Zod input `{ ticketId, assigneeTeamMemberId, slot: "FE"|"BE"|"Project" }`; JWT verified in code; service-role client for lookups.
- Loads ticket `formatted_id`, `title`, `project_id`; skips if the assignee isn't notifiable for that project.
- DM: "You've been assigned {formatted_id}: {title}" with the slot and a button to `{APP_BASE_URL}/projects/{project_id}/tickets#open-ticket:{ticketId}`.

## 5. Edge function `notify-slack-estimate-revision`
- Zod input `{ estimateChangeId }`; skips unless the row's `status = 'pending'`.
- Loads the change row, its ticket, and the proposer's name.
- Finds PMBAs via `project_members` (role = PMBA) for that project, filters to those notifiable for the project, resolves each Slack id.
- One immediate DM per PMBA: "{proposer} requested a {discipline} estimate change on {formatted_id}: {prev}h → {new}h — {reason}", with a button to `/projects/{project_id}/change-requests`.

## 6. Call sites (fire-and-forget)
- New `src/features/notifications/notifySlack.ts` wrapping `supabase.functions.invoke`, swallowing errors.
- Assignment — fired only for genuinely new `(ticket_id, slot, user_id)` inserts, computed from each surface's existing diff (no fire on removal or unchanged re-save):
  - `src/features/tickets/AssignDialog.tsx`
  - `src/features/tickets/bulk-assign/useBulkAssign.ts`
  - `src/features/tickets/add-dialog/useDraftRows.ts`
- Estimate revision — `RequestMoreTimeDialog.tsx`, right after a successful insert, only in the `!canAutoApprove` branch.

## 7. Settings UI
- **Global**: a Notification settings dialog from the TopBar user dropdown with the `team_members.slack_notifications_enabled` switch.
- **Per project**: in Project Settings → Team tab (`src/features/project/settings/ProjectTeamTab.tsx`), each member row gets a Slack-notifications switch writing `project_members.slack_notifications_enabled`. PMBAs can toggle anyone; a non-PMBA can toggle only their own row.

## 8. Tests (vitest, `src/test/mocks/supabase.ts`)
- Assignment diff: one invoke per newly inserted (ticket, slot, user); none on removal or re-save.
- Estimate revision: no invoke when auto-approved; one invoke when pending.
- Fan-out unit: one DM per project PMBA, and members opted out globally or per project are skipped.

## Notes
- No changes to `daily-logoff-summary`; nudges are sent immediately.
- `supabase/config.toml` gets entries for the two new functions.
