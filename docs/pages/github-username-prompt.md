# GitHub username prompt

A small one-time dialog that appears after sign-in if the user hasn't linked a GitHub username yet.

## Layout
- Title: "Link your GitHub account".
- Explanatory line about why it's needed (PR sync, issue assignment).
- Single text input for the GitHub handle, with inline validation (lowercase, no spaces, valid handle pattern).
- **Save** primary button and **Skip for now** ghost button.

## Interactions
- Save writes the handle onto the user's profile and dismisses the dialog. The dialog will not reappear in this session even if the call fails — failures show a toast.
- Skip dismisses for the session; the prompt will reappear on next login until a handle is set.
- The dialog can be reopened from the user menu in the top bar.
