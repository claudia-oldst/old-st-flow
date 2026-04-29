## Goal
Give users a subtle, low-friction way to declutter their kanban cards by hiding the parts they don't care about — without changing the layout when everything is on.

## UX

Add a small icon-only button right next to the existing **Filter** button in the Project Tickets sticky toolbar (`src/features/tickets/ProjectTickets.tsx`). The button uses the `Eye` (lucide) icon, the same `outline` `h-8` styling as Filter, and shows a tiny dot indicator when one or more parts are hidden.

Click opens a Popover (matching the Filter popover styling) titled **"Card display"** with a checklist of toggleable card parts. Each row uses the same `FilterRow` look (checkbox + label) so it feels native.

Toggleable parts (default: all visible):
- Ticket ID (e.g. `ACR-042`)
- Type icon
- Title (always on — not toggleable; hiding makes the card meaningless)
- Discipline status chips (FE/BE pills)
- Hours bars (FE/BE/Project progress bars)
- Assignee avatars row
- "P" badge corner dot for Proj tickets

A **"Reset"** link at the bottom restores all to visible.

## Persistence

Store preferences in `localStorage` under key `card-display-prefs-v1` as `{ id, type, chips, bars, assignees, projBadge }` booleans. Lives across sessions and projects (it's a viewing preference, not project data). No backend changes.

## Technical changes

**New file**: `src/features/tickets/useCardDisplayPrefs.ts`
- Exports `CardDisplayPrefs` type, defaults, and a `useCardDisplayPrefs()` hook returning `[prefs, setPrefs, reset]` with localStorage persistence.

**New file**: `src/features/tickets/CardDisplayMenu.tsx`
- Small Popover trigger (Eye icon button) + checklist UI. Reuses styling from `TicketsFilter`'s `FilterRow` pattern (kept local to this file for now, no extraction needed).
- Shows subtle accent dot when any pref is off.

**Modify** `src/features/tickets/TicketCard.tsx`
- Accept optional `prefs?: CardDisplayPrefs` prop (default = all visible to preserve current behavior elsewhere, e.g. drag overlay).
- Conditionally render: type icon, formatted_id line, discipline status chip row, hours bar block, assignee footer row, Proj "P" badge.
- If hours bars hidden AND chips hidden, collapse the whitespace so the card visibly shrinks.

**Modify** `src/features/board/ProjectBoard.tsx`
- Read `prefs` from the hook and pass to `<TicketCard prefs={prefs} />` in `DraggableCard`, `DraggableDisciplineCard`, and the `DragOverlay` instance.

**Modify** `src/features/tickets/ProjectTickets.tsx`
- Render `<CardDisplayMenu />` immediately after `<TicketsFilter ... />` in the toolbar (line ~430). Only shown when `view === "board"` since list view doesn't use TicketCard.

## What stays the same
- No DB / migration changes.
- No changes to filtering, data fetching, or list view.
- TicketDetailSheet remains unaffected (always shows full info).
- Default appearance unchanged for first-time users.

```text
Toolbar:  [Board|List]  [Filter ⌄]  [👁 ⌄]      ...search... [+ Add]
                                     │
                                     ▼ Popover
                                  Card display
                                  ☑ Ticket ID
                                  ☑ Type icon
                                  ☑ Status chips
                                  ☑ Hours bars
                                  ☑ Assignees
                                  ☑ Project badge
                                  ─────────────
                                          Reset
```
