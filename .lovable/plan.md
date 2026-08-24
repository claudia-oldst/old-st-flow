# Userback: send all submitted media to the ticket discussion

Today the webhook only re-hosts a single `screenshot_url`. Any other images or files Userback sends (extra attachments, annotated images, session/video links) are dropped, so the ticket discussion is missing part of the picture.

## What changes

- Accept every media field Userback can send, not just one screenshot:
  - `screenshot_url` (existing)
  - `attachments` — array of items that may be plain URL strings or objects with a url/name/type
  - `attachment_url` / `image_url` / `file_url` single-value fallbacks
  - `video_url` / `session_url` — recording links (kept as links, not downloaded)
- Download and re-host each image/file into the `ticket-attachments` bucket under the ticket's folder, one storage object per file, and attach them all to the single Userback discussion comment.
- Keep the original filename where Userback provides one; otherwise generate `userback-screenshot-1.png`, `userback-attachment-2.pdf`, etc.
- Classify each attachment as `image`, `video`, or `file` from its MIME type so the discussion renders images inline.
- Cap at 10 attachments per comment (existing discussion limit); any extras beyond that are listed as links at the bottom of the comment body.
- If a download or upload fails for one file, log it and continue with the rest, and append that file's original URL as a link in the comment body so nothing is silently lost.
- Recording/session links are appended to the comment body under a short "Recording" line.

## Result

One discussion comment per Userback submission containing the reporter line, their message, environment block, every re-hosted image/file inline, and links for anything that could not be re-hosted.

## Technical notes

- All work is in `supabase/functions/userback-webhook/index.ts`; no schema or UI changes.
- Body schema gains a permissive `attachments` union (`string | { url, name?, type? }`) plus the optional single-URL and video fields; unknown extra fields stay ignored.
- Re-hosting is refactored from the inline single-screenshot block into a reusable `rehost(url, index, name?)` helper returning a comment-attachment object matching `commentAttachmentSchema` (`{ url: "", path, name, mime, size, kind }`).
- Downloads run sequentially with a per-file try/catch and are bounded by the 10-attachment cap to keep the function within its execution budget.
- Function is redeployed after the change.
