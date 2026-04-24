import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/types";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { ProjectTickets } from "@/features/tickets/ProjectTickets";
import { ProjectTeam } from "@/features/team/ProjectTeam";
import { ProjectHealth } from "@/features/health/ProjectHealth";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("projects").select("*").eq("id", id).maybeSingle().then(({ data }) => setProject(data));
  }, [id]);

  const tabs = useMemo(
    () => [
      { to: "", label: "Board", end: true },
      { to: "tickets", label: "Tickets" },
      { to: "team", label: "Team" },
      { to: "health", label: "Health" },
    ],
    []
  );

  if (!id) return null;

  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 pt-6 pb-12">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-dim hover:text-foreground transition mb-3">
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="font-mono text-xs px-2 py-1 rounded-md bg-white/5 hairline text-dim">
          {project?.acronym ?? "..."}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{project?.name ?? "Loading..."}</h1>
      </div>

      <nav className="flex gap-1 hairline-b mb-6">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "px-4 py-2.5 text-sm transition relative",
                isActive ? "text-foreground" : "text-dim hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {t.label}
                {isActive && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<ProjectBoard projectId={id} />} />
        <Route path="tickets" element={<ProjectTickets projectId={id} />} />
        <Route path="team" element={<ProjectTeam projectId={id} />} />
        <Route path="health" element={<ProjectHealth projectId={id} />} />
      </Routes>
    </div>
  );
}
