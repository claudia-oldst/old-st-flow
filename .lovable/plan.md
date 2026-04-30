## Fix client portal RPC enum mismatch

The `get_client_portal` RPC filters ticket status using `'in_progress'`, but the `status_category` enum in this database uses `'active'`. This causes the editor preview and public portal to fail to load.

### Migration

Recreate `public.get_client_portal(_hash text)` with the correct enum value:

```sql
-- Replace 'in_progress' with 'active' in the two places it's referenced:
-- 1) epic_rows aggregation
COUNT(tr.id) FILTER (WHERE tr.status_category = 'active')::int AS in_progress_tickets
-- 2) totals aggregation
'tickets_in_progress', COUNT(*) FILTER (WHERE status_category = 'active')
```

JSON output keys (`in_progress_tickets`, `tickets_in_progress`) stay the same so no frontend changes are needed.

### Out of scope

- The Calendar `forwardRef` warning in the console is a pre-existing shadcn warning, unrelated to the load failure. Leaving as-is.
