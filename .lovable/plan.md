# Thalamus internal vs external feedback

When Thalamus sends a report:
- `internal: true` — Feedback ticket created with **Version = "Internal Feedback"**, and **no Slack message** to the project's linked channel.
- `internal: false` — Feedback ticket created with **Version = "External - Thalamus"**, Slack channel alert sent as today.
- Field missing (older senders) — treated as external.

## Technical details
- `supabase/functions/thalamus-feedback/schema.ts`: add `internal: z.boolean().optional()`.
- `index.ts`: set `version` on insert based on the flag; skip `notifySlack` when internal.
- Small test for the version/Slack decision; redeploy `thalamus-feedback`.
- No database changes (`version` is an existing ticket field).
