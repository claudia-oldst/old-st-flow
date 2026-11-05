# Ticket IDs past 999 keep every digit

Ticket numbers get at least 3 digits but are never cut short: 7 shows as ACR-007, 1156 shows as ACR-1156. Today, Postgres `LPAD(n, 3, '0')` cuts 1156 down to "115".

## Changes (one migration)
- Pull the live definitions of `before_ticket_insert`, `sync_ticket_formatted_ids` and `enforce_bug_parent`, plus any other function whose body contains `LPAD(...ticket_number...)` (found with a `pg_proc` search). Re-create each one unchanged except for the ticket-number padding, which becomes `LPAD(n::text, GREATEST(3, length(n::text)), '0')`.
- Leave bug sub-numbers (`:01`) and Feedback `FB-n` labels as they are.
- Backfill: rebuild `formatted_id` for any non-Feedback ticket with `ticket_number >= 1000` whose stored ID is wrong. Then rebuild the bug children's IDs (`parent:NN`) for those parents.

## Frontend
- The app has no code that builds ticket IDs from numbers. It only displays the stored `formatted_id`, so it needs no logic change. The "Tickets will be numbered ACR-001" hint stays correct.

## Verification
- Query the database to confirm a 4-digit number gives a full ID, and that no stored IDs are left truncated.
