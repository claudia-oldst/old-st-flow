# Logoff message button restyle

Change the round calendar icon button in the top bar into a labelled text button, like the example.

- Icon: message square (instead of calendar), small, before the text.
- Label: "Generate Logoff Message".
- Style: our ghost button look: no border, small rounded corners, muted text that brightens on hover with a subtle background, small medium-weight text.
- Keep the tooltip ("Generate logoff message") and the same dialog when clicked.

## Technical details
- Only `src/features/logoff/LogoffSummaryButton.tsx` changes: use shadcn `Button` (`variant="ghost" size="sm"`) with `h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground`, `MessageSquare` icon `h-3.5 w-3.5`. No hardcoded colours.
