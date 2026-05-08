import { Link } from "react-router-dom";
import { Archive, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { relativeTime } from "./useProjectsList";

export function ProjectCard({
  project,
  count,
}: {
  project: Project;
  count: { tickets: number; members: number };
}) {
  const archived = project.is_archived;
  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        "group glass rounded-2xl p-5 hover:bg-white/[0.04] transition relative overflow-hidden",
        archived && "opacity-60 grayscale hover:opacity-80 hover:grayscale-0",
      )}
    >
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="flex items-start justify-between mb-6 gap-2">
        <div className="font-mono text-xs px-2 py-1 rounded-md bg-white/5 hairline text-dim">
          {project.acronym}
        </div>
        {archived ? (
          <Badge className="bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/30 hover:bg-brand-gold/20 gap-1">
            <Archive className="h-3 w-3" /> Vaulted
          </Badge>
        ) : (
          <ArrowRight className="h-4 w-4 text-dimmer group-hover:text-foreground transition" />
        )}
      </div>
      <div className="text-lg font-semibold tracking-tight">{project.name}</div>
      {project.client_name && (
        <div className="text-xs text-dim mt-0.5">{project.client_name}</div>
      )}
      <div className="mt-4 flex gap-3 text-xs text-dim">
        {archived ? (
          <span>Archived {relativeTime(project.archived_at)}</span>
        ) : (
          <>
            <span>{count.tickets} ticket{count.tickets === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{count.members} member{count.members === 1 ? "" : "s"}</span>
          </>
        )}
      </div>
    </Link>
  );
}
