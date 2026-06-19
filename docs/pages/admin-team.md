# Admin — Team members

**Tab:** `/admin` → Team members (default tab).

Workspace-wide team roster management.

## Layout
- **+ Add member** button (top-right).
- Table of members with columns: avatar, name, email, role (PMBA / Member), GitHub handle, weekly capacity (h), status (Active / Inactive), actions.

## Interactions
- Role dropdown changes a member's role inline (PMBA gain access to admin + protected actions).
- Capacity field is editable inline; powers the Weekly Hours bar and sprint capacity.
- GitHub handle is editable inline.
- Status toggle deactivates a member (they can still sign in but appear muted in pickers).
- Action menu: Remove from workspace (with confirmation).

## Add member dialog
- Email (must end in `@old.st`).
- Display name.
- Initial role.
- Weekly capacity.
- On submit: an entry is created; the user gains access the next time they sign in.

## Self-protection
- A PMBA can't demote themselves if they're the only PMBA — the role select for the last PMBA is disabled with a tooltip.
