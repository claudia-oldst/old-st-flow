# Userback feedback → tickets

Feedback submitted through Userback lands in the matching project as a normal ticket, prefixed `UB - `, with the reporter's comment, environment info and screenshot in the discussion thread.

## 1. Database migration

- Add nullable `userback_project_id TEXT` to `public.projects`.
- Seed `app_settings` with `userback_webhook_url` pointing at the new function (`ON CONFLICT DO NOTHING`). The `userback_webhook_secret` row stays a manual PMBA insert.
- Seed a system team member "Userback" (fixed UUID, email `userback@old.st`, role `PMBA`-neutral — will use an existing role value) to author the imported comments. This is required: `ticket_comments.user_id` is `NOT NULL` and foreign-keyed to `team_members`, so a null author is not possible.

## 2. Edge function `userback-webhook`

Structured like `github-sync-ticket` (npm `@supabase/supabase-js@2`, shared `corsHeaders`, zod validation, service-role client).

- Reject with 401 unless header `x-userback-secret` equals the `userback_webhook_secret` value in `app_settings`.
- Validate body: `project_id`, `category`, `title`, `comment`, `screenshot_url`, `reporter_name`, `reporter_email`, `widget_data` (all optional except `project_id`).
- Category mapping: `feature_request` → `CR`; everything else (`bug`, `general`, unknown) → `Bug`.
- Resolve project by `userback_project_id`. No match → 400, no ticket created.
- Insert the ticket with `title = "UB - " + (title || "Untitled feedback")`, mapped `ticket_type`, resolved `project_id`. Existing triggers assign `ticket_number`, `formatted_id` and default status.
- If `screenshot_url` is present, fetch the bytes and re-upload to the private `ticket-attachments` bucket at `${ticket.id}/${uuid}.png`, then store it in the comment's `attachments` array using the app's existing attachment shape (`{ url: "", path, name, mime, size, kind: "image" }`) so the discussion renders it via signed URLs.
- Insert one `ticket_comments` row authored by the Userback system member:
  `📥 Submitted via Userback by {reporter_name} ({reporter_email})`, then the reporter's comment, then a fenced `Environment` block built from `widget_data` when present.
- Respond `{ ok: true, ticket_id, formatted_id }`.
- Function config: `verify_jwt = false` in `supabase/config.toml` (Userback can't send a Supabase JWT; the shared secret is the auth).

## 3. Project Settings UI

- `ProjectDetailsTab.tsx`: new "Userback project ID" text input directly under "GitHub repo URL", disabled when `!canEdit`, helper text "Feedback submitted via Userback for this project ID will be created as tickets here, prefixed 'UB'."
- `useProjectSettings.ts`: `userbackProjectId` state initialised from `project.userback_project_id ?? ""`, reset in the existing `open` effect, and saved as `userback_project_id: userbackProjectId.trim() || null` in `handleSaveDetails`.
- `src/lib/schemas/project.ts`: add an optional trimmed `userback_project_id` string to `projectDetailsSchema`.

## 4. Types

`Project` in `src/lib/types.ts` derives from the generated Supabase types, so `userback_project_id` appears automatically once the migration runs — no manual type edit needed.

## Post-deploy (manual, by a PMBA)

1. `INSERT INTO app_settings (key, value) VALUES ('userback_webhook_secret', '<random>');`
2. In Userback, add an outgoing webhook to the function URL with header `x-userback-secret: <random>`.
3. Paste each Userback project ID into the matching project's Settings → Details.
