## Client tab updates

Three changes to `src/features/client-portal/ClientPortalEditor.tsx` plus a small backend addition so the PMBA preview works even when the public link is disabled.

### 1. Remove per-epic Save CTA

In `EpicSummaryEditor`:
- Remove the "Save" button.
- Auto-save `pmba_text` on textarea blur (and keep silent auto-save on the "Show to client" toggle, which already exists).
- Keep the "Generate / Regenerate" button as-is.

Result: epic cards have no manual save; edits persist automatically.

### 2. Split the Snapshot card into "Update" + "Publish to client"

Currently a single "Publish to client" button writes both `client_summary_draft` and `client_summary_published` and rotates the cutoff.

New behaviour:
- **Update** (primary, in the Snapshot card): saves `client_visibility_cutoff = asOf` and `client_summary_draft = intro`. Refreshes the preview. Does NOT touch `client_summary_published`, so the public URL keeps showing the previously published version.
- **Publish to client** (separate button, also in the Snapshot card): copies the current draft to `client_summary_published`, sets `client_summary_updated_at = now()`, and ensures a hash exists. This is what pushes the saved updates to the public `/h/:hash` URL.
- The "Last published …" timestamp stays tied to `client_summary_updated_at` (i.e. only changes on Publish, not on Update).

Per-epic summaries (`project_epic_summaries`) are already written directly and visible to both preview and public RPC, so no change needed there beyond #1.

### 3. PMBA preview works when the public URL is disabled

Today `usePortalPreview` early-returns when `hash` is null, and the existing `get_client_portal(_hash)` RPC requires a hash. So disabling the portal also blanks the PMBA editor — wrong.

Fix:
- Add a new SECURITY DEFINER RPC `get_project_portal_preview(_project_id uuid, _cutoff timestamptz)` that returns the same JSON shape as `get_client_portal`, but keyed off `project_id` directly and using the supplied cutoff (falling back to `now()` if null). It does NOT require `client_portal_hash` to be set. Intended for PMBA editor preview only.
- Update `usePortalPreview` to:
  - Always call the new RPC (passing `asOf`), regardless of whether `hash` is set.
  - Stop writing `client_visibility_cutoff` to the projects table on every preview change (cutoff is now passed per-call). The cutoff is persisted only when the PMBA hits **Update** or **Publish to client**.
- Update the editor's empty-state copy: when `hash` is null, the right-hand preview still renders normally; only the "Public link" block in the Snapshot card stays hidden, with copy like *"Public link disabled. The client cannot view the URL, but you can still plan what they'd see."*
- "Disable" continues to clear `client_portal_hash`. "Publish to client" re-enables it (creates a new hash if missing).

### Technical notes

- New migration: create `public.get_project_portal_preview(uuid, timestamptz)` as a SECURITY DEFINER function, body adapted from `get_client_portal` but selecting the project by `id` and using `COALESCE(_cutoff, now())` for the cutoff. RLS on `projects` is permissive so no policy changes are needed; the function is gated by being called from the PMBA editor (which already checks `isPMBA`).
- The public `/h/:hash` flow (`usePublicPortal` + `get_client_portal`) is unchanged — it keeps requiring a valid hash and a non-null cutoff, so disabling still hides the public page.
- `EpicSummaryEditor.persist` already exists; reuse it from an `onBlur` handler on the text area.
