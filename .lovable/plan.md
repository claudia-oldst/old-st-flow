# @mentions in ticket discussions

Type `@` in the discussion composer, pick a person from an autocomplete list, and they get a Slack DM linking straight to that ticket's discussion.

## What the user sees

- Typing `@` in a comment or reply box opens a dropdown of project members (filtered as you keep typing the name). Arrow keys + Enter/Tab or click to pick; Escape closes it.
- The chosen person is inserted as a highlighted chip-style name in the comment text.
- Posted comments render mentions as a highlighted name (not raw text).
- Each mentioned person receives a Slack DM: who mentioned them, the ticket, a short excerpt of the comment, and an "Open discussion" button that deep-links to the ticket.
- People are not notified for mentioning themselves, and existing per-project Slack mute preferences are respected.
- Editing a comment only notifies people who were newly added as mentions.

## Technical approach

**Storage format**: mentions are stored inline in the comment body as `@[Name](mention:<team_member_id>)`. This is standard markdown link syntax, so existing markdown rendering and the comment length/validation schema keep working unchanged.

**Composer (`src/features/comments/CommentComposer.tsx`)**
- New `MentionAutocomplete` popover driven by caret position: detect an `@word` token before the caret, query project members, render suggestions, insert the mention token on select.
- Composer needs the `projectId` (already available at `TicketComments` / `CommentThread`; pass through as a new prop) to load candidates via a small `useMentionCandidates(projectId)` hook over `project_members` + `team_members`.

**Rendering (`src/features/comments/commentMarkdown.tsx`)**
- Extend the existing `a` component override: hrefs matching `^mention:<uuid>$` render as a non-link highlighted span/badge instead of an external link (same pattern already used for `#open-ticket:` links).

**Notifications**
- New event `comment_mention` in `supabase/functions/slack-notify/index.ts`: loads the comment, ticket, project, author and mentioned member; checks `project_notification_prefs`; resolves the Slack ID via `slack_user_id` or email lookup; sends a Block Kit DM with an "Open discussion" button using the existing `app_base_url` + `?ticket=<id>` deep link, with unfurling off.
- New DB trigger on `ticket_comments` (INSERT and UPDATE of `body`): parses mention ids out of the body with a regex, skips the author and (on update) ids already present in `OLD.body`, and calls the existing `public.enqueue_slack_notify` once per mentioned user.

**Docs**: update `docs/pages/ticket-detail-sheet.md` to describe mention behaviour.

## Out of scope

- In-app notification centre / unread badges (Slack DM only).
- Mentioning people who are not members of the project.
