## Add GitHub issue badge to tickets

Show a small GitHub icon + `#<issue number>` next to the ticket ID. Clicking it opens the issue in a new tab. If the ticket has not been synced, the badge is hidden — that absence is itself the "not synced yet" signal.

### Where it appears
- **Ticket list row** (`TicketsListRow.tsx`) — inline next to `formatted_id`.
- **Ticket detail header** (`TicketDetailHeader.tsx`) — inline next to `formatted_id`.

### Visual
- Lucide `Github` icon (12–14px) + `#123` in mono, `text-dimmer` with `hover:text-foreground`.
- Anchor with `target="_blank"` and `rel="noopener noreferrer"`. URL: `${project.github_repo_url}/issues/${ticket.github_issue_number}`.
- New shared component: `src/features/github/GithubIssueBadge.tsx` for reuse.

### Data
- Already available on the ticket (`github_issue_number`) and project (`github_repo_url`). No schema or query changes.
- Render only when both are non-null.

### Out of scope
- No retry button, no last-sync timestamp, no toasts (per your earlier answer).
- No backfill for tickets created before the sync existed — they stay un-badged until next edit triggers a sync.
