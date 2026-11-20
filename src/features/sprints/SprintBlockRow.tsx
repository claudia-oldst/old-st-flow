import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatarStack } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { Sprint, SprintMember } from "./types";
import { ThinCapBar } from "./sprint-block/ThinCapBar";
import { CapInput } from "./sprint-block/DevDisciplineCell";
import { AddMemberInline } from "./sprint-block/AddMemberInline";
import { EditSprintPopover } from "./sprint-block/EditSprintPopover";
import { useSprintBlock } from "./sprint-block/useSprintBlock";
import { SprintCapacityPanel } from "./roadmap/SprintCapacityPanel";
import type { SprintTotals } from "./roadmap/sprintTotals";

interface Props {
  sprint: Sprint;
  others: Sprint[];
  devMembers: SprintMember[];
  projectId: string;
  isPMBA: boolean;
  totals: SprintTotals | undefined;
  onOpen: (sprintId: string) => void;
}

export function SprintBlockRow({ sprint, others, devMembers, projectId, isPMBA, totals, onOpen }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { capFor, addedMembers, availableMembers, stackMembers, updateCap, addMember, removeMember, removeSprint } =
    useSprintBlock({ sprint, devMembers, projectId });

  const today = format(new Date(), "yyyy-MM-dd");
  const isActive = sprint.start_date <= today && sprint.end_date >= today;
  const isClosed = sprint.end_date < today;
  const capFE = addedMembers.reduce((s, m) => s + capFor(m.user_id, "FE"), 0);
  const capBE = addedMembers.reduce((s, m) => s + capFor(m.user_id, "BE"), 0);
  const fe = totals?.sprint.FE;
  const be = totals?.sprint.BE;
  const committedCount = (fe?.committedCount ?? 0) + (be?.committedCount ?? 0);

  return (
    <div className="hairline rounded-md bg-surface-1/40">
      <div className="h-12 flex items-center gap-3 px-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-dim hover:text-foreground transition" aria-label={expanded ? "Collapse" : "Expand"}>
          <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
        </button>
        <button type="button" onClick={() => onOpen(sprint.id)} className="text-sm font-medium w-20 shrink-0 text-left hover:text-accent transition" title="Plan this sprint on the Roadmap">
          Sprint {sprint.sprint_number}
        </button>
        <div className="text-xs text-dim font-mono shrink-0">
          {format(parseISO(sprint.start_date), "MMM d")} → {format(parseISO(sprint.end_date), "MMM d")}
        </div>
        {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase tracking-wide">active</span>}
        {isClosed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dimmer uppercase tracking-wide">closed</span>}
        {stackMembers.length > 0 && <MemberAvatarStack members={stackMembers} size="xs" max={4} />}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {capFE > 0 && <ThinCapBar label="FE" committed={fe?.committed ?? 0} planned={fe?.planned ?? 0} cap={capFE} />}
          {capBE > 0 && <ThinCapBar label="BE" committed={be?.committed ?? 0} planned={be?.planned ?? 0} cap={capBE} />}
        </div>
        {isPMBA && <EditSprintPopover sprint={sprint} others={others} />}
        {isPMBA && (
          <Button variant="ghost" size="icon" onClick={() => removeSprint(committedCount)} className="h-7 w-7" title={committedCount ? "Sprint has committed tickets" : "Delete sprint"}>
            <Trash2 className="h-3.5 w-3.5 text-dim" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1">
          <SprintCapacityPanel
            members={addedMembers}
            totals={totals}
            capFor={capFor}
            rowExtra={isPMBA ? (m, d) => <CapInput value={capFor(m.user_id, d)} onCommit={(h) => updateCap(m.user_id, d, h)} /> : undefined}
            rowEnd={isPMBA ? (m) => (
              <Button variant="ghost" size="icon" onClick={() => removeMember(m.user_id)} className="h-6 w-6" title="Remove from sprint">
                <X className="h-3 w-3 text-dim" />
              </Button>
            ) : undefined}
          />
          {isPMBA && (
            <div className="pt-2">
              <AddMemberInline available={availableMembers} onPick={addMember} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
