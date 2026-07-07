## Change

Add a **Skip** option to the GitHub repo prompt when it's triggered from the assign flow, so the user can save the assignees without linking a repo.

## Implementation

**`src/features/auth/GithubLinkDialog.tsx`**
- Add optional `skipLabel?: string` and `onSkip?: () => void` props.
- When both are provided AND `dismissible`, render a third button (ghost variant) between Cancel and Save labelled with `skipLabel`. Clicking it calls `onSkip()` (parent decides what to do — typically close + continue).
- No change to existing callers that don't pass these props.

**`src/features/github/GithubRepoPrompt.tsx`**
- Accept an optional `onSkip?: () => void` prop and forward it to `GithubLinkDialog` with `skipLabel="Skip for now"`.
- Keep the existing validate/submit/onSaved flow untouched.

**`src/features/tickets/AssignDialog.tsx`**
- Pass `onSkip={() => { setRepoPromptOpen(false); void performSave(); }}` to `<GithubRepoPrompt>` so skipping proceeds with the assignment save (assignees persist, no repo written).

## Out of scope
- The `GithubUsernamePrompt` (first-login) stays non-dismissible — no Skip there.
- No RLS, schema, or copy changes elsewhere.

## Verification
- Assign an FE/BE dev on a repo-less project → prompt shows **Cancel / Skip for now / Save**. Skip closes the prompt and persists the assignees without touching `projects.github_repo_url`. Save still validates + saves the URL as today. Cancel aborts both.
