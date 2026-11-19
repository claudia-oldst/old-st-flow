# Active / inactive team members

## What you'll get
- Admin > Team: an **Active** switch on each person. Switching it off archives them (greyed out, sorted under an "Inactive" heading); switch on to restore. Nothing is deleted — their past time logs, comments and assignments stay exactly as they are.
- Inactive people are hidden from:
  - **@mentions** in ticket discussions
  - **Assigning** to tickets (single assign, bulk assign, create-ticket rows, convert-feedback rows, CSV import matching)
  - **Adding to a project team** in project settings / Project Team
  - **Sprint capacity** pickers
- **Team time export**: inactive people show with an "Inactive" tag and start unticked; "Select all" ticks active people only (you can still tick an inactive person to export their history).
- Existing assignments of an inactive person remain visible on tickets so history isn't lost; they just can't be newly chosen.

## Database change (needs your OK)
- Add one column `is_active` (yes/no, default yes) to `team_members`. Everyone currently in the team stays active.
- Only PMBAs can change it (matches who can already edit team members in Admin). No other tables, no data changes.

## Technical details
- Migration: `ALTER TABLE team_members ADD COLUMN is_active boolean NOT NULL DEFAULT true`; extend `guard_team_member_self_update` so non-PMBAs cannot flip their own flag.
- `TeamAdmin.tsx`: Switch per row, active-first ordering.
- Filter `is_active` in pickers: `useMentionCandidates`, `AssignDialog`, `useBulkAssign`, `useDraftRows`, `ConvertFeedbackDialog`, `importTickets`, `ProjectTeam` / `useProjectSettings` add-member lists, sprint capacity.
- `TeamTimeExportDialog`: badge + select-all skips inactive.
- Unit test: candidate filter excludes inactive; export select-all skips inactive.
- AGENTS.md rule: pickers must exclude inactive members; history displays must not.
