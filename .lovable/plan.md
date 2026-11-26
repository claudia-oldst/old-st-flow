# Thalamus internal feedback

When Thalamus sends a report with `internal: true`:
- The Feedback ticket is created as normal, with **Version = "Internal Feedback"**.
- **No Slack message** is posted to the project's linked Slack channel.

When `internal: false` (or the field is absent from older senders): unchanged — no version set, Slack channel alert sent.

## Technical details
- `supabase/functions/thalamus-feedback/schema.ts`: add optional `internal: z.boolean().optional()` (optional so older payloads don't fail).
- `index.ts`: set `version: "Internal Feedback"` on insert when internal; skip `notifySlack` when internal.
- Add a small test for the internal/external branch; redeploy `thalamus-feedback`.
- No database changes (`version` is an existing free-text ticket field).
