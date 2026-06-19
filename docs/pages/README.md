# Page docs

One markdown file per top-level route in `src/pages/`. Each doc covers purpose, data sources, route/URL state, layout, and edge cases.

| Route                 | Doc                                                |
| --------------------- | -------------------------------------------------- |
| `/login`              | [Login.md](./Login.md)                             |
| `/`                   | [Projects.md](./Projects.md)                       |
| `/my-work`            | [MyWork.md](./MyWork.md)                           |
| `/admin`              | [Admin.md](./Admin.md)                             |
| `/projects/:id/*`     | [ProjectWorkspace.md](./ProjectWorkspace.md)       |
| `/h/:hash`            | [ClientPortalPublic.md](./ClientPortalPublic.md)   |
| `*` (catch-all)       | [NotFound.md](./NotFound.md)                       |

Routing is wired in `src/App.tsx`. Public routes: `/login`, `/h/:hash`. Everything else is wrapped in `RequireAuth` (and `RequirePMBA` for `/admin`).
