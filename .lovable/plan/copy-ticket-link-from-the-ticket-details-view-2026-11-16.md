# Copy ticket link from the ticket details view

## What you'll see
- A small copy icon sits next to the ticket title. It is always visible, next to the edit pencil.
- Clicking it copies the ticket number and title as a clickable link, for example **COU-934 — Fix login redirect**.
  - Pasting into Slack, Google Docs, email, Notion or Jira gives the linked text.
  - Pasting into plain-text places gives `COU-934 — Fix login redirect` followed by the link.
- The link opens the project with that ticket's details already open.
- The icon briefly turns into a tick, and a "Link copied" message appears.
- If the browser blocks rich copying, only the link is copied.

## Technical details
- New `src/features/tickets/detail/CopyTicketLinkButton.tsx`. It builds `${origin}/projects/${project_id}?ticket=${id}` (the existing deep link) and writes it with `navigator.clipboard.write` as a `ClipboardItem` containing `text/html` (`<a href>FORMATTED_ID — Title</a>`) and `text/plain`. It falls back to `writeText(url)`.
- Rendered in `TicketDetailHeader.tsx` next to the title. It is not shown while the title is being edited.
- Small pure helper `ticketLink.ts` plus a test for the URL and label format.
