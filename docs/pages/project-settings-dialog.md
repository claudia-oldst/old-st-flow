# Project Settings dialog

Opened from the cog icon in the project workspace header. Read-only for non-PMBA users.

## Tabs
- **Details** — name, acronym (immutable after creation), client name, rate per hour, currency, project start date, GitHub repo URL, Userback project ID (feedback for that ID becomes "UB - " tickets here), links list (label + URL pairs).
- **Timeline** — lifecycle status dropdown (Pre-live, Confirmed, Definition, In Progress, Bug-Fixing, Monitor, Completed, On Hold, Closed Lost). Project start date and Development start date are always shown and always required. Only the fields relevant to the selected status are shown on top of those: Bug-Fixing/Monitor add handover + closing window dates, On Hold adds pause date + reason, Closed Lost adds closed date + reason. Hidden fields keep their saved values. Required fields are validated inline and block saving until filled. PMBA-only.
- **Team** — add/remove project members and set per-member role (PMBA / FE / BE / Project). Inline avatar + name search.

## Interactions
- Field edits save inline.
- Links editor: each row is label + URL with drag-handles to reorder; "+ Add link" appends a new row; trash icon removes one.
- Member picker only lists workspace team members not already on the project.
- A footer **Close** button dismisses the dialog; there's no separate Save — all writes are immediate.

## Permissions
- Non-PMBA users see all fields disabled and the Team tab in read-only mode.
