# Move the Userback webhook secret into Supabase Secrets

You're right — it belongs in Secrets, not in the `app_settings` table.

## Why it ended up there

`app_settings` holds secrets for the **outbound** integrations (GitHub sync, Slack notify), because those are fired by database triggers via `pg_net`. Postgres cannot read edge-function environment variables, so the secret has to live in a table for those.

Userback is the opposite direction: it's an **inbound** webhook handled entirely by the edge function. Nothing in the database needs the secret, so there is no reason to store it in a table where it sits in plain text and is readable by any PMBA-role user.

## What changes

- The `userback-webhook` function reads the shared secret from `Deno.env.get("USERBACK_WEBHOOK_SECRET")` instead of querying `app_settings`, and rejects the request with 401 if the secret is unset or the `x-userback-secret` header doesn't match.
- The `userback_webhook_secret` row is removed from `app_settings` (the `userback_webhook_url` row is not a secret; it stays or can be dropped — it's only a convenience copy of the public function URL).
- You'll be prompted to enter the secret value once via the secret-management flow; it is then available to the function at runtime.

## Note on the existing rows

The GitHub and Slack secrets in `app_settings` stay as they are — those are genuinely needed by database triggers. No change to them in this plan.
