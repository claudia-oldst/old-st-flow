# Thalamus Feedback tickets

## What you'll get
- Thalamus forwards a report to a new intake address in this app. The app creates a **Feedback** ticket in the project whose acronym matches the report's `project_id` (e.g. "AMB").
- Feedback tickets are real tickets, but they **don't show up** in the normal ticket list, board, sprints, Health, client portal or billing. Developers won't see them.
- Each project gets a **Feedback** tab (visible to PMBAs and project members) that lists them. Opening one shows the usual ticket view with its discussion thread.
- The first comment in the thread is written by a "Thalamus" bot user and holds the report: description, page link, reporter, browser/viewport/app version, console errors, network errors and extra details. The screenshot is saved as an attachment on that comment.
- A PMBA can click **Convert** and pick Standard, CR or Bug (a Bug can optionally get a parent ticket). The ticket then shows up in the normal log with a normal ID, keeps its whole discussion thread, and carries a "From Thalamus" badge that links back to the original report.
- Thalamus gets the ticket ID and link back, so its badge opens the ticket here. If the same report is sent twice, no duplicate ticket is made.

## Steps
1. **Database (one migration)**
   - Add `Feedback` to the ticket type list.
   - On tickets: add `external_source` (e.g. "thalamus") and `external_ref` (the Thalamus report id), with each pair kept unique so a retry can't create a duplicate. The source page link stays in the first comment, so no data is stored twice.
   - Add a "Thalamus" bot team member, the same way the Userback bot works.
   - Add `convert_feedback_ticket(ticket_id, new_type, parent_id)`, for PMBAs only. It changes the type, lets the existing ID trigger re-issue the formatted ID, and keeps the comments.
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
- Feedback tickets have no estimates or time logs until they're converted.
