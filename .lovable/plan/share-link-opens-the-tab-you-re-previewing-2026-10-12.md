# Share link opens the tab you're previewing

## What you'll see
- In the Client Portal editor, the copied/opened portal link includes the tab currently shown in the client preview (Timeline, Summary, Billing, Change Requests).
- Example: previewing Billing copies `.../h/<hash>?tab=billing`.
- When a client opens that link, the portal starts on that tab. They can still switch tabs freely.
- Links without a tab (or with an unknown one) open on Timeline as today, so existing shared links keep working.
- The Publish toast's auto-copied link also uses the current tab.

## Technical details
- `ClientPortalEditor.tsx`: make the preview `Tabs` controlled (`previewTab` state, default `timeline`) and pass `previewTab` to `PortalToolbar`.
- `PortalToolbar.tsx`: build `portalUrl` as `/h/${hash}?tab=${previewTab}` (omit param for timeline); used by copy, open-link icon and publish copy.
- Shared `PORTAL_TABS` constant + `parsePortalTab(value)` helper in `src/features/client-portal/portalTabs.ts` (with a small unit test: valid tab passes, unknown falls back to timeline).
- `ClientPortalPublic.tsx`: read `?tab=` via `useSearchParams`, use `parsePortalTab` for `defaultValue`.
- Update `docs/pages/client-portal-editor.md`.
