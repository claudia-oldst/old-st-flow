# Client Portal Editor

**Tab:** `/projects/:id/client` — PMBA only.

The authoring surface for the project's public-facing client portal. Two columns: editor on the left, live preview on the right (preview can be toggled off to focus on writing).

## Toolbar (top)
- **Update** — saves the current draft.
- **Publish** — writes the current draft to the public hash URL and copies the link to clipboard with a toast.
- **Disable** — takes the portal offline (hash returns "not available").
- **Toggle preview** — show/hide the right pane.
- **Open public URL** link icon — opens `/h/:hash` in a new tab.
- **As-of date picker** — recomputes the preview as it would have looked on that date (used to explain history to clients).

## Editor (left)
- **Intro textarea** — markdown, the opening blurb shown above the epic list.
- **Epic summary editors** — one block per epic that has scope changes:
  - Editable summary text.
  - "Include in portal" toggle (hide internal-only epics from the client view).
  - An AI assist button that drafts the summary from the epic's tickets.

## Preview (right)
When open, replicates the public portal exactly, with three tabs:
- **Timeline** — Sprint Gantt scoped to this project.
- **Summary** — `PortalView` with rate visible and applied discounts.
- **Change Requests** — preview of pending/approved CRs the client will see.

## States
- **Loading** — "Loading…" line in the preview pane.
- **Non-PMBA** — entire page is replaced by a "Restricted" notice.
