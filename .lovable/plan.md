## What we're building

When a ticket is created or updated, Lovable mirrors it as a GitHub issue in the project's configured repo. Assigning a dev to a ticket also assigns their GitHub user to the issue. If the project doesn't have a repo yet, the first time someone tries to assign a dev they see a modal (same look/feel as the GitHub username prompt) asking for the GitHub repo URL.

## Database

- `projects.github_repo_url text` (nullable) — stores the full URL the PMBA pastes (e.g. `https://github.com/acme/web`).
- `projects.github_owner text`, `projects.github_repo text` — parsed/normalised on save (used by the edge function; avoids re-parsing).
- `tickets.github_issue_number int` (nullable), `tickets.github_issue_node_id text` (nullable) — set after first successful create, used for later updates.
- RLS: existing `projects: pmba writes update` covers the repo fields; existing `tickets: update scoped` covers the issue-number write done by the edge function (running with service role anyway).

## Secret

- Add `GITHUB_TOKEN` via the secrets tool (PAT with `repo` scope). Used only by the edge function — never exposed to the browser.

## Edge function: `github-sync-ticket`

Inputs: `{ ticket_id: string, action: 'create' | 'update' }`. Server-side it:

1. Auth-checks the caller (must have access to the ticket's project — uses `current_can_access_ticket`-equivalent check).
2. Loads ticket + project + assignees (with their `github_username`).
3. If `projects.github_owner/repo` is null → returns `{ skipped: 'no_repo' }` (frontend will have already shown the modal in that case; this is a safety net).
4. Builds title `[{formatted_id}] {title}`, body containing acceptance criteria + Lovable link.
5. If `tickets.github_issue_number` is null → `POST /repos/{owner}/{repo}/issues` with assignees (only those with a `github_username`), then save the returned `number` + `node_id` back on the ticket.
6. Else → `PATCH /repos/{owner}/{repo}/issues/{number}` with title, body, assignees, and `state: open|closed` derived from the ticket's status category (`done` → closed).
7. Returns a structured result (`{ ok, issue_number, html_url }`) and logs failures with the GitHub error body.

Uses standard CORS headers from `npm:@supabase/supabase-js@2/cors`, validates input with Zod, returns 400/401/403/502 with clean messages.

## Frontend

### Reuse the modal

Generalise `src/features/auth/GithubUsernamePrompt.tsx` into a shared `GithubLinkPromptDialog` (same visual shell — `Dialog`, GitHub icon, validating input, save button, error states) with two configured modes:

- **Username mode** — existing behaviour, called from `App.tsx`.
- **Repo mode** — title "Link a GitHub repo", validates a `https://github.com/{owner}/{repo}` URL, verifies via `GET https://api.github.com/repos/{owner}/{repo}` (public — no token needed for public repos; for private repos the verify call will 404 anonymously, so we fall back to "couldn't verify, save anyway?" only on 404 and let the edge function be the source of truth). On save it writes `github_repo_url`, `github_owner`, `github_repo` to `projects`.

`GithubUsernamePrompt.tsx` becomes a thin wrapper around the generalised dialog so nothing about the existing first-login flow changes.

### Trigger point: assigning a dev

In the ticket assignee UI (the FE/BE assignee pickers used on the ticket detail/sheet — same place that currently writes to `ticket_assignees`):

1. When the PMBA picks a dev, before writing the assignee, check the project's `github_repo_url`.
2. If missing → open the repo modal. On successful save, continue with the assignee write.
3. If present → write the assignee as today, then `supabase.functions.invoke('github-sync-ticket', { body: { ticket_id, action: tickets.github_issue_number ? 'update' : 'create' } })` fire-and-forget with a toast on failure.

### Other sync points

- Ticket create (`QuickAddRow.tsx` + any other insert sites): after insert, if the project has a `github_repo_url`, invoke `github-sync-ticket` with `action: 'create'`. If not, skip silently — sync starts once a dev is assigned.
- Ticket title / status / assignee changes: invoke with `action: 'update'`. Skip if `github_issue_number` is null and there are no dev assignees yet.

A small helper `src/features/github/syncTicket.ts` wraps the invoke + toast-on-error so call sites stay one-liners.

## Out of scope (explicit)

- No webhooks from GitHub back to Lovable (one-way sync).
- No PR linkage, labels, milestones, comments sync.
- No per-user GitHub tokens — single workspace PAT only.
- No retry queue; failed syncs are surfaced via toast and can be retried by re-saving the ticket.
- No backfill of existing tickets — only tickets created/edited after this ships will sync.

## Technical notes

- GitHub repo URL regex: `^https?://github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?$` → `{owner, repo}`.
- Status → GitHub state mapping uses the existing `statuses.category` (`done` → `closed`, everything else → `open`).
- Assignees array sent to GitHub filters out team members whose `github_username` is null (those users will still be triggered into setting one by the existing first-login modal).
- The edge function uses the service-role client for DB writes (issue number write-back) but verifies the caller's JWT first to scope access to the ticket's project.

## Approval needed

1. Add `GITHUB_TOKEN` secret (you'll be prompted after approval).
2. Apply migration adding the four new columns.
3. Then I'll wire the edge function, generalised dialog, and sync call sites.