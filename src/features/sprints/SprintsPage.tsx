import { useSearchParams } from "react-router-dom";
import { useProjectRole, isPMBA as isPMBARole } from "@/features/team/useProjectRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSprints } from "./useSprintBoard";
import { ForecastingCalendar } from "./ForecastingCalendar";
import { RoadmapView } from "./roadmap/RoadmapView";
import { SprintGantt } from "./SprintGantt";

type SprintsTab = "sprints" | "roadmap" | "gantt";

export function SprintsPage({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const isPMBA = isPMBARole(role);
  const { data: sprints = [], isLoading } = useSprints(projectId);
  const [params, setParams] = useSearchParams();
  const tab = (params.get("stab") as SprintsTab) || "sprints";
  const setTab = (t: SprintsTab, ws?: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (t === "sprints") n.delete("stab"); else n.set("stab", t);
      if (ws) n.set("ws", ws);
      return n;
    }, { replace: true });

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
      <Tabs value={tab} onValueChange={(v) => setTab(v as SprintsTab)}>
        <TabsList>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>
        <TabsContent value="sprints" className="mt-4">
          <ForecastingCalendar projectId={projectId} sprints={sprints} isPMBA={isPMBA} onOpenSprint={(id) => setTab("roadmap", id)} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-4">
          <RoadmapView projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
        </TabsContent>
        <TabsContent value="gantt" className="mt-4">
          <SprintGantt projectId={projectId} sprints={sprints} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
