## Goal

Both Slack DMs get clickable links: straight to the ticket, plus the project, and for estimate revisions a link to the approvals screen.

## The gap to close first

The app has no URL that opens a specific ticket. Tickets open through an in-app event (`openTicketEvent`), never via the address bar — so today there is nothing a Slack link could point at. Routes that do exist: `/projects/:id` (tickets list), `/projects/:id/change-requests` (estimate revisions).

So this is two pieces: make ticket deep links work in the app, then use them in Slack.

## 1. Deep link to a ticket

Add a `?ticket=<id>` query parameter to the project tickets route.

- `src/features/tickets/ProjectTickets.tsx` — on mount, read the `ticket` param and open the detail sheet for that ticket. Reuse `fetchTicketById` so it works even when the ticket isn't on the current page or is filtered out.
- Clear the param once the sheet opens, so closing the sheet doesn't reopen it and a refresh behaves sanely.
- If the id is unknown or the user can't access it, fall through to the plain tickets list rather than erroring.

Result: `/projects/{project_id}?ticket={ticket_id}` opens the project *and* the ticket.

## 2. Base URL for the links

The edge function needs to know the app's public address. Store it as an `app_settings` row (`app_base_url`, e.g. `https://oldst-pulse.lovable.app`) alongside the existing `slack_notify_secret`, read once per invocation. If it's absent, messages send as they do now, just without links — never a hard failure.

## 3. Richer Slack messages

Rework both messages in `supabase/functions/slack-notify/index.ts` to use Slack Block Kit instead of plain text, keeping a plain-text fallback for notifications previews.

**Assignment DM**
- Ticket line becomes a link: `<url|DRA-014 — Fix login redirect>`
- Project name becomes a link to the project.
- Keeps the role/slot line.
- An "Open ticket" button.

**Estimate revision DM (to each PMBA)**
- Ticket and project as links, same as above.
- Requester, discipline, and the `Xh → Yh` change as today.
- Two buttons: "Review request" pointing at `/projects/{id}/change-requests`, and "Open ticket".

## Technical detail

- `supabase/functions/slack-notify/index.ts`: fetch `app_base_url` in the same place the notify secret is read; pass it into both handlers. Build links with Slack's `<url|label>` mrkdwn syntax inside a `section` block, plus an `actions` block for the buttons. `chat.postMessage` gets `blocks` and a `text` fallback.
- Slack link labels must escape `&`, `<`, `>` in ticket titles — add a small escape helper; unescaped titles silently mangle the message.
- `src/features/tickets/ProjectTickets.tsx`: `useSearchParams` for the `ticket` param, `fetchTicketById` to load it, then the existing sheet state.
- No migration needed for schema — just one settings row inserted, which I can do as part of the change.
- No new Slack scopes; buttons that are pure links need nothing beyond `chat:write`.
