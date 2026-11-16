import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, FolderKanban, LayoutGrid, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { QuickProject } from "./useQuickProjects";

/** "Projects ▾" nav item: all projects (starred first) with a search box. */
export function ProjectsNavMenu({ projects, active }: { projects: QuickProject[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const term = q.trim().toLowerCase();
  const list = term
    ? projects.filter((p) => p.name.toLowerCase().includes(term) || p.acronym.toLowerCase().includes(term))
    : projects;
  const go = (to: string) => { setOpen(false); setQ(""); navigate(to); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition",
          active ? "bg-white/10 text-foreground" : "text-dim hover:text-foreground hover:bg-white/5",
        )}
      >
        <FolderKanban className="h-3.5 w-3.5" />
        Projects
        <ChevronDown className="h-3 w-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 glass-strong">
        <div className="p-2 hairline-b">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && list[0]) go(`/projects/${list[0].id}`); }}
            placeholder="Search projects…"
            className="w-full rounded-md bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button onClick={() => go("/")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 hairline-b">
          <LayoutGrid className="h-3.5 w-3.5" /> View all projects
        </button>
        <div className="max-h-80 overflow-y-auto py-1">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => go(`/projects/${p.id}`)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/5"
            >
              <Star className={cn("h-3 w-3 shrink-0", p.starred ? "fill-brand-gold text-brand-gold" : "opacity-0")} />
              <span className="font-mono text-xs text-dim w-12 shrink-0">{p.acronym}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          {!list.length && <div className="px-3 py-2 text-xs text-dimmer">No projects found</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
