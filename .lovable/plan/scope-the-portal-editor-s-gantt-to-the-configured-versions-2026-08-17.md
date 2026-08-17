# Scope the portal editor's Gantt to the configured versions

The public client portal timeline is already version-scoped server-side: `get_client_portal_gantt` filters tickets and sprint commitments by `projects.client_portal_versions`. The gap is the PMBA-facing preview inside the Client Portal editor — it renders the full project Gantt and ignores the version selection, so what the PMBA reviews doesn't match what the client sees.

## What changes

In the Client Portal editor, the Timeline preview respects the Versions multi-select in the toolbar:

- Selecting versions immediately re-renders the preview with only tickets in those versions (including the "No version" bucket).
- Empty selection keeps showing all versions, as today.
- Epics left with no in-scope tickets disappear from the preview, matching the public portal behaviour.

No change to the public portal — it already filters correctly.

## Technical notes

- `useGanttData(projectId, sprints, discipline, versions?)` — filter the tickets it feeds into `buildGanttRows` using the existing `versionKeyOf` helper from `src/features/health/versionFilter.ts`; `undefined`/empty means all.
- `SprintGantt` and `SprintGanttOrEmpty` gain an optional `versions?: string[]` prop passed straight through. The Sprints tab keeps calling them without it, so its behaviour is unchanged.
- `ClientPortalEditor.tsx` passes the editor's `versions` state (already available from `useClientPortalEditor`) into `SprintGanttOrEmpty`.
- Update `docs/pages/client-portal-editor.md` to note the timeline preview is version-scoped.
