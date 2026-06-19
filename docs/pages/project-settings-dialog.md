# Project Settings dialog

Opened from the cog icon in the project workspace header. Read-only for non-PMBA users.

## Tabs
- **Details** — name, acronym (immutable after creation), client name, rate per hour, currency, project start date, GitHub repo URL, links list (label + URL pairs).
- **Team** — add/remove project members and set per-member role (PMBA / FE / BE / Project). Inline avatar + name search.

## Interactions
- Field edits save inline.
- Links editor: each row is label + URL with drag-handles to reorder; "+ Add link" appends a new row; trash icon removes one.
- Member picker only lists workspace team members not already on the project.
- A footer **Close** button dismisses the dialog; there's no separate Save — all writes are immediate.

## Permissions
- Non-PMBA users see all fields disabled and the Team tab in read-only mode.
