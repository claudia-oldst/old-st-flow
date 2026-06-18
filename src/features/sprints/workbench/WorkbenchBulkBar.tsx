import { ArrowRight, ArrowRightCircle, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkMenu, BulkMenuRow } from "@/features/tickets/bulk-actions/BulkMenu";
import type { Sprint, SprintMember } from "../types";

interface Props {
  source: "pool" | "dev" | null;
  sprintDevs: SprintMember[];
  otherSprints: Sprint[];
  nextSprint: Sprint | undefined;
  onAssignToDev: (userId: string) => void;
  onMoveToSprint: (sprintId: string) => void;
  onCarryOver: () => void;
  onRemoveFromSprint: () => void;
}

export function WorkbenchBulkBar({
  source,
  sprintDevs,
  otherSprints,
  nextSprint,
  onAssignToDev,
  onMoveToSprint,
  onCarryOver,
  onRemoveFromSprint,
}: Props) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-[10px] uppercase tracking-wider text-dim px-2">
        {source === "pool" ? "Pool" : "Sprint"}
      </span>

      {source === "pool" && (
        <>
          <BulkMenu icon={UserPlus} label="Assign to" title="Assign to dev" width="w-56">
            {sprintDevs.length === 0 ? (
              <div className="text-xs text-dim px-2 py-2">No devs available</div>
            ) : (
              sprintDevs.map((d) => (
                <BulkMenuRow key={d.user_id} onClick={() => onAssignToDev(d.user_id)}>
                  <span className="truncate">{d.member.name}</span>
                  <span className="text-[10px] text-dimmer ml-auto">{d.role}</span>
                </BulkMenuRow>
              ))
            )}
          </BulkMenu>
          <BulkMenu icon={ArrowRight} label="Move to Sprint" title="Move to sprint" width="w-56">
            {otherSprints.length === 0 ? (
              <div className="text-xs text-dim px-2 py-2">No other sprints</div>
            ) : (
              otherSprints.map((s) => (
                <BulkMenuRow key={s.id} onClick={() => onMoveToSprint(s.id)}>
                  Sprint {s.sprint_number}
                </BulkMenuRow>
              ))
            )}
          </BulkMenu>
        </>
      )}

      {source === "dev" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-dim hover:text-foreground gap-1.5"
            onClick={onCarryOver}
            disabled={!nextSprint}
            title={
              nextSprint
                ? `Carry over to Sprint ${nextSprint.sprint_number}`
                : "No next sprint exists — create one in the Roadmap tab first."
            }
          >
            <ArrowRightCircle className="h-3.5 w-3.5" /> Carry over
          </Button>
          <BulkMenu icon={ArrowRight} label="Move to Sprint" title="Move to sprint" width="w-56">
            {otherSprints.length === 0 ? (
              <div className="text-xs text-dim px-2 py-2">No other sprints</div>
            ) : (
              otherSprints.map((s) => (
                <BulkMenuRow key={s.id} onClick={() => onMoveToSprint(s.id)}>
                  Sprint {s.sprint_number}
                </BulkMenuRow>
              ))
            )}
          </BulkMenu>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-dim hover:text-destructive gap-1.5"
            onClick={onRemoveFromSprint}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </>
      )}
    </div>
  );
}
