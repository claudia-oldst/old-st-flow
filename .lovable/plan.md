## Migration: enforce Proj-ticket FE/BE = 0 invariant

### Part 1 — Backfill existing data

1. **Roll FE+BE estimates into project_*** for `ticket_type='Proj'`:
   ```sql
   UPDATE tickets SET
     original_project_estimate = original_fe_estimate + original_be_estimate + original_project_estimate,
     current_project_estimate  = current_fe_estimate  + current_be_estimate  + current_project_estimate,
     original_fe_estimate = 0, original_be_estimate = 0,
     current_fe_estimate  = 0, current_be_estimate  = 0
   WHERE ticket_type = 'Proj';
   ```

2. **Reassign FE/BE time logs on Proj tickets to Project discipline**:
   ```sql
   UPDATE time_logs SET discipline = 'Project'
   WHERE discipline IN ('FE','BE')
     AND ticket_id IN (SELECT id FROM tickets WHERE ticket_type='Proj');
   ```

3. **Recalculate actuals** for Proj tickets (FE/BE = 0; Project = SUM of all logs):
   ```sql
   UPDATE tickets t SET
     actual_frontend_hours = 0,
     actual_backend_hours  = 0,
     actual_project_hours  = COALESCE((SELECT SUM(hours) FROM time_logs WHERE ticket_id = t.id), 0)
   WHERE t.ticket_type = 'Proj';
   ```

4. **fe_status / be_status**: leave untouched (per your instruction).

### Part 2 — Enforcement triggers (prevent future drift)

**Trigger A — `enforce_proj_ticket_zero_fe_be`** (BEFORE INSERT/UPDATE on `tickets`):
- If `NEW.ticket_type = 'Proj'`:
  - Move any non-zero `original_fe_estimate` + `original_be_estimate` into `original_project_estimate`, then zero them.
  - Move any non-zero `current_fe_estimate` + `current_be_estimate` into `current_project_estimate`, then zero them.
  - Force `actual_frontend_hours = 0`, `actual_backend_hours = 0`.

**Trigger B — `coerce_proj_time_log_discipline`** (BEFORE INSERT/UPDATE on `time_logs`):
- If the ticket's `ticket_type = 'Proj'` and `NEW.discipline IN ('FE','BE')`, set `NEW.discipline := 'Project'`.
- The existing `apply_time_log` AFTER trigger then correctly rolls hours into `actual_project_hours`.

### Result

- Existing Proj tickets cleaned up: FE/BE fields = 0, all hours/estimates live on Project.
- Going forward: any insert/update on a Proj ticket or its time logs is auto-corrected at the DB level — even if the UI or an import sends FE/BE values.
- No application code changes needed.
