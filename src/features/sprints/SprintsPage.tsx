import { useState } from "react";
import { useProjectRole, isPMBA as isPMBARole } from "@/features/team/useProjectRole";
import { useSprints } from "./useSprintBoard";
import { ForecastingCalendar } from "./ForecastingCalendar";
import { SprintWorkbench } from "./SprintWorkbench";
import { cn } from "@/lib/utils";

export function SprintsPage({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const isPMBA = isPMBARole(role);
  const { data: sprints = [], isLoading } = useSprints(projectId);
  const [tab, setTab] = useState<"forecast" | "workbench">("forecast");

  if (isLoading) {
    return <div className="text-sm text-dim py-6">Loading sprints…</div>;
  }

  return (
    <div className="space-y-4">
      {!isPMBA && (
        <div className="text-[11px] text-dim hairline rounded-md px-3 py-2 bg-surface-1/40">
          Read-only view — only PMBAs can edit sprints, capacities, or assignments.
        </div>
      )}
      <div className="flex gap-1 hairline-b">
        {(
          [
            { id: "forecast", label: "Forecasting Calendar" },
            { id: "workbench", label: "Sprint Workbench" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-2 text-xs transition relative",
              tab === t.id ? "text-foreground" : "text-dim hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
          </button>
        ))}
      </div>

      {tab === "forecast" ? (
        <ForecastingCalendar projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
      ) : (
        <SprintWorkbench projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
      )}
    </div>
  );
}
