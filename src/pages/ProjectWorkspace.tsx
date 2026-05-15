import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/types";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

import { ProjectTickets } from "@/features/tickets/ProjectTickets";
import { ProjectHealth } from "@/features/health/ProjectHealth";
import { ProjectChangeRequests } from "@/features/estimates/ProjectChangeRequests";
import { ProjectChangeRequestTickets } from "@/features/change-requests/ProjectChangeRequestTickets";
import { ProjectSettingsDialog } from "@/features/project/ProjectSettingsDialog";
import { ExportProjectDialog } from "@/features/project/ExportProjectDialog";
import { ClientPortalEditor } from "@/features/client-portal/ClientPortalEditor";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { VaultDashboard } from "@/features/vault/VaultDashboard";
import { ArrowLeft, Download, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, PAGE_SHELL } from "@/lib/utils";

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const role = useProjectRole(id);
  const canEdit = isPMBA(role);
  const [exportOpen, setExportOpen] = useState(false);

  const loadProject = useCallback(() => {
    if (!id) return;
    supabase.from("projects").select("*").eq("id", id).maybeSingle().then(({ data }) => setProject(data));
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useRealtimeReload(
    id ? [{ table: "projects", filter: `id=eq.${id}` }] : null,
    loadProject,
    !!id,
  );

  const tabs = useMemo(
    () =>
      [
        { to: "", label: "Tickets", end: true },
        { to: "change-requests-cr", label: "Change Requests" },
        canEdit ? { to: "change-requests", label: "Estimate Revisions" } : null,
        { to: "health", label: "Health" },
        canEdit ? { to: "client", label: "Client" } : null,
      ].filter(Boolean) as Array<{ to: string; label: string; end?: boolean }>,
    [canEdit]
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">{project?.name ?? "Loading..."}</h1>
        {project?.client_name && (
          <span className="text-sm text-dim">· {project.client_name}</span>
        )}
        {project?.is_archived && (
          <Badge className="bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/30 hover:bg-brand-gold/20 gap-1">
            <Archive className="h-3 w-3" /> Vaulted
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          {project && canEdit && !project.is_archived && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExportOpen(true)}
              aria-label="Export project data"
              title="Export project data"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {project && (
            <ProjectSettingsDialog
              project={project}
              canEdit={canEdit}
              onUpdated={(p) => setProject(p)}
            />
          )}
          {project && (
            <ExportProjectDialog
              open={exportOpen}
              onOpenChange={setExportOpen}
              project={project}
            />
          )}
        </div>
      </div>

      {project?.is_archived ? (
        <VaultDashboard project={project} />
      ) : (
        <>
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
            <Route index element={<ProjectTickets projectId={id} />} />
            <Route path="change-requests-cr" element={<ProjectChangeRequestTickets projectId={id} />} />
            <Route path="change-requests" element={<ProjectChangeRequests projectId={id} />} />
            <Route path="health" element={<ProjectHealth projectId={id} />} />
            <Route path="client" element={<ClientPortalEditor />} />
          </Routes>
        </>
      )}
    </div>
  );
}
