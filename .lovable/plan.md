# Keep line breaks in acceptance criteria

## What's wrong
Your line breaks are being saved correctly. The problem is how the saved text gets displayed. The display treats it as formatted text (markdown), and that format joins single line breaks into one paragraph. Only blank lines start a new paragraph. That's why "Given / When / Then" ends up on one line.

## Fix
- Show every line break exactly as you typed it, both in the saved view and in Preview.
- Keep everything else the same: lists, bold text and other formatting still work.
- Existing tickets display correctly straight away. Nothing in the saved data changes.

## Technical details
- Add the `remark-breaks` package and include it in the `remarkPlugins` of `src/features/tickets/detail/MarkdownView.tsx`, next to `remark-gfm`.
- No database or save-logic changes.
