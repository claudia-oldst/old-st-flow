# Remove Userback, keep Thalamus

## What changes for you
- The "Userback project ID" field disappears from Project Settings → Details.
- Pulse stops accepting Userback feedback (its receiving address is switched off).
- Existing tickets that came from Userback stay as normal tickets; nothing is deleted.

## Steps
1. **Settings screen:** remove the Userback field from the Details tab, its form state, and its save/validation rules.
2. **Intake:** delete the `userback-webhook` function (code, config entry, and the deployed function). The shared intake helper stays for Thalamus only.
3. **Database (migration):** drop the `projects.userback_project_id` column and the `userback_webhook_url` setting row. The Userback bot user is kept so authorship of its past comments still shows.
4. **Docs:** remove Userback from the Project Settings doc and AGENTS.md (helper described as Thalamus intake).

## Technical details
- Files: `ProjectDetailsTab.tsx`, `useProjectSettings.ts`, `ProjectSettingsDialog.tsx`, `src/lib/schemas/project.ts`, `supabase/config.toml`, `supabase/functions/userback-webhook/` (rm), `_shared/intake.ts` header comment, `docs/pages/project-settings-dialog.md`, `AGENTS.md`.
- Run `supabase--delete_edge_functions(["userback-webhook"])` after removing code.
- Migration: `ALTER TABLE projects DROP COLUMN IF EXISTS userback_project_id;` and delete the settings row (check table name in the original migration first).
