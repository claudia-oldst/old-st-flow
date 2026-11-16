import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { QuickProject } from "./useQuickProjects";

/** Up to 3 starred projects as one-click chips in the top bar. */
export function StarredProjectChips({ projects }: { projects: QuickProject[] }) {
  const { pathname } = useLocation();
  const starred = projects.filter((p) => p.starred).slice(0, 3);
  if (!starred.length) return null;
  return (
    <div className="hidden md:flex items-center gap-1.5">
      {starred.map((p) => {
        const active = pathname.startsWith(`/projects/${p.id}`);
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            title={p.name}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-xs transition hairline",
              active ? "bg-primary/20 text-foreground ring-1 ring-primary" : "text-dim hover:text-foreground hover:bg-white/5",
            )}
          >
            {p.acronym || p.name.slice(0, 4)}
          </Link>
        );
      })}
    </div>
  );
}
