# Admin (`/admin`)

**Source:** `src/pages/Admin.tsx` · **Protected + PMBA gate** (wrapped in `RequirePMBA` upstream)

## Purpose
Single page for workspace-wide administration. Tabbed shell switching between three admin modules.

## Tabs
| Key        | Label          | Component                                           | Visibility |
| ---------- | -------------- | --------------------------------------------------- | ---------- |
| `team`     | Team members   | `TeamAdmin` (`src/features/admin/TeamAdmin.tsx`)     | Always     |
| `statuses` | Statuses       | `StatusesAdmin` (`src/features/admin/StatusesAdmin.tsx`) | Always |
| `rules`    | Status rules   | `StatusRulesAdmin` (`src/features/admin/StatusRulesAdmin.tsx`) | PMBA only |

- Default tab: `team`.
- `isPMBA` is derived from `useCurrentUser().user.role === "PMBA"`.
- `StatusRulesAdmin` receives `canEdit={isPMBA}`.

## Layout
- Header eyebrow ("Workspace") + `<Settings>` icon + "Admin".
- Tab bar with hairline underline; active tab gets a foreground bar under it (mirrors `ProjectWorkspace` nav style).
- Local `TabButton` component handles icon + active styling.
