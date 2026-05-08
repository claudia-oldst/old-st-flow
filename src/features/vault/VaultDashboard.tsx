import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Download, FileJson, RotateCcw } from "lucide-react";
import { useVaultDownload } from "./useArchiveProject";
import { useRehydrateProject } from "./useRehydrateProject";
import { MemberRemapDialog } from "./MemberRemapDialog";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";

interface Props {
  project: Project;
}

const formatGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function VaultDashboard({ project }: Props) {
  const navigate = useNavigate();
  const role = useProjectRole(project.id);
  const canRestore = isPMBA(role);
  const download = useVaultDownload();
  const rehydrate = useRehydrateProject();
  const [remapOpen, setRemapOpen] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  const handleRehydrate = async (memberMap: Record<string, string> = {}) => {
    const result = await rehydrate.mutateAsync({ projectId: project.id, memberMap });
    if (result.missing_users?.length) {
      setMissing(result.missing_users);
      setRemapOpen(true);
      return;
    }
    if (result.ok) {
      setRemapOpen(false);
      navigate(`/projects/${project.id}`);
    }
  };

  const counts = (project.vault_row_counts ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Archive className="h-5 w-5 text-brand-gold" />
          <Badge className="bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/30 hover:bg-brand-gold/20">
            Vaulted
          </Badge>
          {project.archived_at && (
            <span className="text-xs text-dim">
              Archived {new Date(project.archived_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <h2 className="font-display text-xl font-semibold mb-1">Project vault</h2>
        <p className="text-sm text-dim">
          This project's live data has been moved to cold storage. You can download
          the snapshot artifacts or restore it back into the workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">
            Total hours logged
          </div>
          <div className="font-mono text-3xl font-semibold">
            {Number(project.cached_total_hours ?? 0).toFixed(1)}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">
            Total cost
          </div>
          <div className="font-mono text-3xl font-semibold">
            {formatGBP(Number(project.cached_total_cost ?? 0))}
          </div>
        </div>
      </div>

      {Object.keys(counts).length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-3">
            Snapshot contents
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="text-sm">
                <div className="font-mono text-lg">{v}</div>
                <div className="text-dim text-xs capitalize">{k.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => download(project.id, "xlsx")}
        >
          <Download className="h-4 w-4" /> Download Excel report
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => download(project.id, "json")}
        >
          <FileJson className="h-4 w-4" /> Download raw JSON
        </Button>
        {canRestore && (
          <Button
            className="gap-2 ml-auto"
            disabled={rehydrate.isPending}
            onClick={() => handleRehydrate()}
          >
            <RotateCcw className="h-4 w-4" />
            {rehydrate.isPending ? "Restoring…" : "Re-hydrate project"}
          </Button>
        )}
      </div>

      <MemberRemapDialog
        open={remapOpen}
        onOpenChange={setRemapOpen}
        missingUserIds={missing}
        onConfirm={(map) => handleRehydrate(map)}
      />
    </div>
  );
}
