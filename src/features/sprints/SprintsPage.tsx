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
      <Tabs value={tab} onValueChange={(v) => setTab(v as "forecast" | "workbench")}>
        <TabsList>
          <TabsTrigger value="forecast">Forecasting Calendar</TabsTrigger>
          <TabsTrigger value="workbench">Sprint Workbench</TabsTrigger>
        </TabsList>
        <TabsContent value="forecast" className="mt-4">
          <ForecastingCalendar projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
        </TabsContent>
        <TabsContent value="workbench" className="mt-4">
          <SprintWorkbench projectId={projectId} sprints={sprints} isPMBA={isPMBA} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
