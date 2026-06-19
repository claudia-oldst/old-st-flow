# Admin — Statuses

**Tab:** `/admin` → Statuses.

Manages the workflow statuses tickets can be in (the coloured pill on every ticket).

## Layout
- Table of statuses with columns: order handle, colour swatch, name, category (todo / in_progress / done), default flag, usage count, actions.
- **+ Add status** button.

## Interactions
- Drag the order handle to reorder statuses (controls how they appear in pickers and Group-by-Status sections).
- Click a colour swatch to open a colour picker.
- Edit the name inline.
- Category select sets behaviour: `done` statuses hide tickets from My Work; `in_progress` powers Workbench.
- "Default" radio sets the status auto-applied to new tickets.
- Delete is blocked if usage count > 0 (with a tooltip suggesting reassignment).

## Add status dialog
- Name, category, colour, optional "set as default".
