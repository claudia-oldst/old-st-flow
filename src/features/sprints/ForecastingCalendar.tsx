import { useMemo } from "react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Sprint } from "./types";
import { memberDisciplines } from "./types";
import { useProjectMembers } from "./useSprintBoard";
import { SprintPoolingTable } from "./SprintPoolingTable";
import { SprintBlockRow } from "./SprintBlockRow";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

export function ForecastingCalendar({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const { data: members = [] } = useProjectMembers(projectId);
  const devMembers = useMemo(
    () => members.filter((m) => memberDisciplines(m.role).length > 0),
    [members],
  );

  const appendNext = async () => {
    const last = [...sprints].sort((a, b) => b.sprint_number - a.sprint_number)[0];
    const nextNumber = (last?.sprint_number ?? 0) + 1;
    const start = last ? addDays(parseISO(last.end_date), 1) : new Date();
    const end = addDays(start, 13);
    const { error } = await supabase.from("sprints").insert({
      project_id: projectId,
      sprint_number: nextNumber,
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", projectId] });
  };

  if (sprints.length === 0) {
    return (
      <div className="hairline rounded-md p-6 text-center space-y-3">
        <div className="text-sm text-dim">No sprints yet.</div>
        {isPMBA && (
          <Button onClick={appendNext} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create first sprint
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {sprints.map((s) => (
          <SprintBlockRow
            key={s.id}
            sprint={s}
            devMembers={devMembers}
            projectId={projectId}
            isPMBA={isPMBA}
          />
        ))}
        {isPMBA && (
          <div className="flex justify-end pt-1">
            <Button onClick={appendNext} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> Append next sprint block
            </Button>
          </div>
        )}
      </div>

      <SprintPoolingTable
        projectId={projectId}
        sprints={sprints}
        isPMBA={isPMBA}
      />
    </div>
  );
}
