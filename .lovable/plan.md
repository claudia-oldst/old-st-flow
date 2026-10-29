# Thalamus Feedback tickets

## What you'll get
- Thalamus forwards a report to a new intake address in this app. The app creates a **Feedback** ticket in the project whose acronym matches the report's `project_id` (e.g. "AMB").
- Feedback tickets are real tickets, but they **don't show up** in the normal ticket list, board, sprints, Health, client portal or billing. Developers won't see them.
- Each project gets a **Feedback** tab (visible to PMBAs and project members) that lists them. Opening one shows the usual ticket view with its discussion thread.
- The first comment in the thread is written by a "Thalamus" bot user and holds the report: description, page link, reporter, browser/viewport/app version, console errors, network errors and extra details. The screenshot is saved as an attachment on that comment.
- A PMBA can click **Convert** and pick Standard, CR, Bug or Project (a Bug can optionally get a parent ticket). The ticket then shows up in the normal log with a normal ID, keeps its whole discussion thread, and carries a "From Thalamus" badge that links back to the original report. Before conversion it shows exactly the same fields as a normal ticket. Converting to Project follows the existing Project rules: FE/BE hours move to project hours.
- Acceptance criteria can be written or generated on Feedback tickets using the existing button. The existing generator also reads the ticket's discussion thread (on every ticket, not just Feedback): it takes the latest comments, trimmed and with personal details removed. This means the bug report, client replies and PMBA clarifications all shape the criteria. It's a small change to the existing generator, and no new function is added.
- Thalamus gets back the ticket's internal id and link, plus a neutral Feedback label instead of a project ID, so its badge opens the ticket here. If the same report is sent twice, no duplicate ticket is made.

## Steps
1. **Database (one migration)**
   - Add `Feedback` to the ticket type list.
   - On tickets: add `external_source` (e.g. "thalamus") and `external_ref` (the Thalamus report id), with each pair kept unique so a retry can't create a duplicate. The source page link stays in the first comment, so no data is stored twice.
   - Add a "Thalamus" bot team member, the same way the Userback bot works.
   - Feedback tickets get **no project prefix or number**: the ID triggers skip them, and they're shown with a neutral label such as "Feedback #a1b2" taken from the Thalamus report id. They don't use up the project's ticket number sequence.
   - Add `convert_feedback_ticket(ticket_id, new_type, parent_id)`, for PMBAs only. At conversion the ticket takes the project's next ticket number and prefix (e.g. AMB-105, or a bug sub-number under its parent). It joins the end of the ticket order, and its comments stay.
   - Exclude `ticket_type = 'Feedback'` from the ticket list, portal and billing functions, and block Feedback tickets from sprints (reusing the guard that already stops Proj tickets).
2. **Intake function `thalamus-feedback`** (built like `userback-webhook`)
   - Checks the shared secret from `x-feedback-secret` or `Bearer`, validates the payload, and looks up the project by acronym.
   - Uses the Idempotency-Key: if the report already exists, it returns the existing ticket.
   - Downloads the screenshot right away (the link expires after 15 minutes) and saves it to the comment-attachments storage.
   - Creates the ticket and the first comment, then returns `{ ok, ticket_id, formatted_id, url }`. Errors come back as `{ ok:false, error }`.
3. **Frontend**
   - Hide Feedback tickets in the app's own ticket searches (list, board, pool, health).
   - New Feedback tab with a list, a detail sheet and a Convert dialog for PMBAs.
   - "From Thalamus" badge in the ticket detail view.
4. **Setup:** request the `THALAMUS_FEEDBACK_SECRET` secret (you'll paste the same value into Thalamus) and give you the intake URL.
5. **Checks:** tests for the payload-to-comment formatting and the Convert rules, plus docs at `docs/pages/thalamus-feedback.md`.

## Assumptions
- Report types map only to a suggested type shown in Convert: bug→Bug, feature→CR, general→Standard. The PMBA makes the final choice.
- Feedback tickets can be edited like any ticket in the existing detail view: estimates, epic, version, assignees and acceptance criteria. Their hours count towards Health, billing and the portal only after conversion, so triage doesn't skew the figures.

## Reuse rules (no duplicates)
- **Intake:** `userback-webhook` and `thalamus-feedback` share one helper module for checking the secret, resolving the project, inserting the ticket and posting the first comment. There is no second copy of that logic.
- **Bot user:** the Thalamus bot is a row in `team_members`, just like the Userback bot. There's no new user system.
- **Numbering:** the existing `before_ticket_insert` and `sync_ticket_formatted_ids` triggers are extended to skip Feedback tickets and to assign the number and prefix when the type changes at conversion. No new numbering trigger is added.
- **Sprint guard:** only the existing `block_proj_ticket_in_sprint` check is widened to cover Feedback. Estimates use the existing estimate, epic and version triggers with no changes.
- **Bug parent:** conversion to Bug goes through the existing `enforce_bug_parent` trigger and the existing ParentTicketSelect.
- **Screens:** the Feedback tab reuses `TicketsList` with a type filter, and the existing `TicketDetailSheet` and comment thread. Attachments are uploaded with `uploadCommentAttachment`. Convert is a small dialog that uses the existing type select and ParentTicketSelect.
- **Hiding Feedback:** one shared filter is applied in `list_project_tickets` and in the shared ticket fetch hooks, not scattered across each screen.
