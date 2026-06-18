import { SprintGantt } from "@/features/sprints/SprintGantt";
import { useSprints } from "@/features/sprints/useSprintBoard";

/**
 * Owns the sprints fetch so both the PMBA portal editor and the public
 * client portal can render the same gantt-or-empty-state without duplicating
 * the query.
 */
export function SprintGanttOrEmpty({ projectId }: { projectId: string }) {
  const { data: sprints = [] } = useSprints(projectId);
  if (sprints.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
        No sprint timeline available yet.
      </div>
    );
  }
  return <SprintGantt projectId={projectId} sprints={sprints} hideExport />;
}
