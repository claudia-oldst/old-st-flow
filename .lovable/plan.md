## Goal

Make `github-sync-ticket` write a GitHub issue body that matches your example template, populating every section we can derive from existing ticket data — no AI, no schema changes. Also add GitHub **labels** for type / status / epic for filtering.

## Section-by-section coverage of your template

| Template section | Source | Status |
|---|---|---|
| Ticket Number | `formatted_id` | ✅ |
| Story Type | `ticket_type` → Task / Bug / Feature (your mapping) | ✅ |
| Domain | — | ⛔ no field, omitted |
| Priority | — | ⛔ no field, omitted |
| Effort | total hours → `XS ≤4h · S ≤8h · M ≤16h · L ≤40h · XL >40h` | ✅ derived |
| Recommended Workflow Prompt | — | ⛔ no field, omitted |
| Estimated Effort (detail) | `current_fe_estimate` / `current_be_estimate` / `current_project_estimate` | ✅ |
| User Story | `title` (one-line "As described: <title>") | ✅ partial |
| Expected Results | — | ⛔ no field, omitted |
| Acceptance Criteria | `acceptance_criteria` (markdown, passed through) | ✅ |
| Touches (file globs) | — | ⛔ no field, omitted |
| Assumptions & Cross-Service Dependencies | parent ticket (bugs) + epic name | ✅ partial |

Sections with no data source are **omitted entirely** rather than rendered empty, so the issue stays clean. Once new fields exist (priority, domain, expected results, touches) they slot straight into the template.

## Body template (rendered)

```
## Ticket Number
GTD-08

## Story Type
Task | Bug | Feature

## Effort
S (≤ 8h)

## Estimated Effort (detail)
BE 2h · FE 4h · Project 1h

## User Story
<ticket.title>

## Acceptance Criteria
<ticket.acceptance_criteria>

## Epic
<epic name>          ← omitted if none

## Parent ticket
#<parent.github_issue_number>   ← bugs only, GitHub auto-links
                                  fallback: parent.formatted_id text

## Version
<version>            ← omitted if empty

---
Synced from Lovable · ticket `FORMATTED_ID`
```

Title stays `[FORMATTED_ID] Title`. Open/closed state derivation (already in place) is untouched.

## Labels (new)

Applied on every sync, full replacement each time so renames propagate:

- `type: task` | `type: bug` | `type: feature` (per your mapping)
- `epic: <epic name>` when `epic_id` is set
- `status: <status name>` (lowercased)

Each label is ensured on the repo first: `GET /labels/{name}` → on 404 `POST /labels` with a sensible default color (bug=red, feature=blue, task=gray, epic=purple, status=neutral). 422 "already exists" ignored.

## Implementation (one file)

Edit `supabase/functions/github-sync-ticket/index.ts`:

1. Widen the ticket `select` to: `ticket_type, epic_id, parent_ticket_id, current_fe_estimate, current_be_estimate, current_project_estimate, version`.
2. Extend the status query to also fetch `name`.
3. Add two parallel admin lookups: epic name from `project_epics`, parent ticket `formatted_id, github_issue_number` from `tickets`.
4. Helpers in-file:
   - `storyType(ticket_type)` → `"Task" | "Bug" | "Feature"`
   - `effortBucket(totalHours)` → `"XS (≤ 4h)" | "S (≤ 8h)" | …`
   - `renderBody(...)` → assembles sections, skipping empties
5. Build the label list and ensure each label exists on the repo before sending.
6. Pass `labels` in both create and update payloads alongside existing `title`, `body`, `assignees`, `state`.

## Out of scope (would need new ticket fields)

Domain, Priority, Recommended Workflow Prompt, Expected Results, Touches (file globs), Assumptions / cross-service deps. Happy to follow up with a small schema migration to add the high-value ones (priority, domain) if you want.

## Verification

- Sync a Standard ticket → issue body shows Story Type "Task", correct Effort bucket, estimates, AC.
- Sync a Bug whose parent is already synced → "Parent ticket" line links to parent issue.
- Move ticket to a `done`-category status → issue closes and `status:` label updates.
- Rename an epic → next sync replaces `epic:` label on the issue.
