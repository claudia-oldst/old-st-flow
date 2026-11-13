# AI-drafted monthly client email

## What you'll get
On the client page (PMBA view), a **"Draft client email"** button. Pick a month (defaults to last full month), click Generate, and a ready-to-copy email appears in an editable box with a **Copy** button. Regenerate if you want another version. Nothing is sent automatically.

## Email shape
```text
Hi {Client},

Please see the report for {Project} for {Month Year}. For the month of {Month},
the team logged {X}h, made up of the following:

- **{Epic A}** ({h}h) – 1-2 broad sentences on what was done.
- **{Epic B}** ({h}h) – ...
  (2-4 epics with the most hours; epics under 5% of the month's hours are skipped)

Bugs: 1-2 sentences on the types of bugs worked on, {h}h logged on bug tickets.
Change requests: 1-2 sentences on the CRs worked on, {h}h logged.

In summary, {X}h was logged in {Month}, bringing the amount due to {R amount}.

If you have any questions or encounter any issues, please don't hesitate to reach out. Thank you very much!

Regards,
{your name}
```

## Rules
- All numbers (hours per epic, bug/CR hours, amount owed) are calculated by Pulse, not the AI — the AI only writes the descriptive sentences.
- Amount owed = (hours logged that month − discounts/unbilled that month) × project rate, same as the Billing tab.
- Descriptions use ticket names and time-log reasons from that month only. UK English, client-friendly, no invented details.
- Feedback tickets excluded, as everywhere else.

## Technical details
- New edge function `client-month-email`: PMBA-only; loads the month's time logs (ticket title, type, epic, description, hours) and discounts for the project; computes totals, top epics (≥5%, max 4), bug/CR hours, amount owed; asks the AI (Lovable AI, `openai/gpt-6-astra`, Responses API, streamed, strict JSON schema) for one summary per top epic plus bug and CR sentences; assembles the email server-side so figures can't drift.
- Frontend: `src/features/client-portal/email/` — `ClientEmailDialog.tsx`, `useClientEmail.ts`, pure `buildEmail.ts` (+ test for 5% cutoff, top-4 limit, amount owed). Button added to the client page header in the editor.
- No database changes.
