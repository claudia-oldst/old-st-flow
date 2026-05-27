## Goal

Add a small "Copy AI prompt" button in the Acceptance Criteria section header (next to Generate / Add) that copies a pre-formatted prompt to the clipboard, ready to paste into NotebookLM or similar tools.

## Prompt template

```
I am a {role}, looking to understand the following ticket in context of the wider {epic} feature and project.

Ticket: {title}
Epic: {epic}

1. Who are the users impacted by this ticket?
2. How does this ticket influence other related features or parts of the project?
3. What are the specific business rules discussed for related to this ticket?
4. What is a simple summary of the expected outcome of this ticket?
```

If no epic is set, the Epic line and the "wider {epic} feature and" phrase are omitted gracefully.

## Changes

1. `src/features/tickets/detail/AcceptanceCriteria.tsx`
   - Accept new props: `ticketTitle: string`, `epicName: string | null`, `role: ProjectRole | null`.
   - Add a ghost icon button (Lucide `Sparkles` + `Copy` combination, matching the screenshot — small icon-only button placed before "Generate") with tooltip "Copy AI prompt".
   - On click: build prompt from props, call `navigator.clipboard.writeText`, toast "AI prompt copied".
   - Show the button in both the view and edit headers (consistent with Generate placement).

2. `src/features/tickets/TicketDetailSheet.tsx`
   - Pass `ticketTitle={ticket.title}`, `epicName={ticket.epic_name}`, `role={role}` to `<AcceptanceCriteria />`.

No backend, schema, or business logic changes.
