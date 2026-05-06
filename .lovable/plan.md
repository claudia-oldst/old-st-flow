## AI-Generate Acceptance Criteria

Add a "Generate" (Sparkles) button next to Preview/Edit in the Acceptance Criteria editor. Clicking it calls a new edge function that uses Lovable AI to draft criteria grounded in the project context + ticket title, fills the textarea, and lets the user edit and Save normally.

### 1. New edge function — `supabase/functions/generate-acceptance-criteria/index.ts`

Input: `{ ticket_id }`. Server-side:
- Loads the ticket (title, type, version, epic, project_id).
- Loads the project (name, client) and epic name.
- Loads up to 40 sibling tickets (formatted_id + title + type) for project context.
- Uses up to 3 sibling tickets that already have acceptance criteria as style examples.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a system prompt instructing concise, testable Markdown criteria (Given/When/Then or numbered checklist). Returns `{ draft }`.
- Handles 429/402 with friendly error JSON, full CORS.

### 2. Frontend — `src/features/tickets/TicketDetailSheet.tsx`

In the existing `AcceptanceCriteria` component:
- Add a `generating` state and a `handleGenerate` that calls `supabase.functions.invoke('generate-acceptance-criteria', { body: { ticket_id: ticketId } })`, sets `draft` to the returned `draft`, switches to edit mode (not preview), toasts on error (incl. 402/429 messages).
- Add a Sparkles button:
  - In **read mode** (when `canEdit`): shown next to "Add/Edit". Label = "Generate" when empty, "Regenerate" when content exists. Opens the editor and immediately runs generation when empty; when content exists, asks for confirm before overwriting.
  - In **edit mode**: shown in the toolbar next to Preview, label "Generate" / spinner.
- The user can edit the generated text and Save uses the existing flow (no schema change).

### Files

Created:
- `supabase/functions/generate-acceptance-criteria/index.ts`

Edited:
- `src/features/tickets/TicketDetailSheet.tsx` — Sparkles button + generate handler in `AcceptanceCriteria`.
