import { useState } from "react";
import { useProjectRole, isPMBA as isPMBARole } from "@/features/team/useProjectRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSprints } from "./useSprintBoard";
import { ForecastingCalendar } from "./ForecastingCalendar";
import { SprintWorkbench } from "./SprintWorkbench";

export function SprintsPage({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const isPMBA = isPMBARole(role);
  const { data: sprints = [], isLoading } = useSprints(projectId);
  const [tab, setTab] = useState<"roadmap" | "planning">("roadmap");

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
      <Tabs value={tab} onValueChange={(v) => setTab(v as "roadmap" | "planning")}>
        <TabsList>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>
        <TabsContent value="roadmap" className="mt-4">
          <ForecastingCalendar projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
        </TabsContent>
        <TabsContent value="planning" className="mt-4">
          <SprintWorkbench projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
