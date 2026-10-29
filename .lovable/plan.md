# Feedback tickets: triage-only view + "Convert" confirmation form

## What changes for the user

**While a ticket is Feedback (FB-n)** the ticket view is a triage view. It only shows:
- Title, description and the discussion thread (Thalamus report included)
- Acceptance criteria: write or generate them
- Estimates (FE / BE / Project): set them
- Epic and version
- A **Convert to ticket** button (PMBA only)

These are hidden until the ticket is converted:
- Dev status per discipline (FE/BE to do / in progress / ...) and the project status picker
- Assignees and the Assign controls
- Timer, time logging and the time log list
- Estimate change requests (an estimate set during triage is just the original estimate)

**Convert to ticket** opens a dialog that matches the "Add tickets" row in your screenshot, already filled in from the feedback ticket:
- Title, Type (Standard / CR / Bug / Proj), Parent ticket (Bug only), Epic, Status (Backlog by default), FE hours, BE hours, Version, Assign
- The same checks as Add tickets apply (title required, a Bug needs a parent, a Proj ticket uses project hours instead of FE/BE)
- Confirming saves the fields, gives the ticket its project number and prefix (e.g. PUL-104), keeps the thread and the "From Thalamus" badge, and takes it off the Feedback tab.

The "Feedback · convert to…" option in the type dropdown goes away. The button replaces it.

## Technical notes
- `TicketDetailBody` / `TicketDetailHeader`: an `isFeedback` flag hides StatusBlock, AssigneeBlock, TimeLogsPanel, the timer controls and EstimateChangesPanel. EstimatesPanel edits the original estimates directly.
- Pull the single-row editor out of `AddTicketsDialog.tsx` into a shared `TicketDraftRow` that both dialogs use, so the fields stay identical. New `ConvertFeedbackDialog` renders one prefilled row.
- On confirm, update the fields (epic, version, estimates, status, assignees) first, then call the existing `convert_feedback_ticket` RPC. No database changes. The existing triggers handle numbering and the Proj/Bug rules.
- Remove the Feedback branch from `useTicketEditor.handleChangeType`.
- Add a small test for the conversion validation (Bug without parent is rejected; Proj moves FE/BE hours to project hours).
