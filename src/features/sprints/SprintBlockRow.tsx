import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar, MemberAvatarStack } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { Sprint, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import { ThinCapBar } from "./sprint-block/ThinCapBar";
import { DevDisciplineCell } from "./sprint-block/DevDisciplineCell";
import { AddMemberInline } from "./sprint-block/AddMemberInline";
import { EditSprintPopover } from "./sprint-block/EditSprintPopover";
import { useSprintBlock } from "./sprint-block/useSprintBlock";

interface Props {
  sprint: Sprint;
  devMembers: SprintMember[];
  projectId: string;
  isPMBA: boolean;
}

export function SprintBlockRow({ sprint, devMembers, projectId, isPMBA }: Props) {
  const [expanded, setExpanded] = useState(false);
  const {
    capFor,
    addedMembers,
    availableMembers,
    pooledFE,
    pooledBE,
    pooledPerDev,
    capFE,
    capBE,
    stackMembers,
    updateCap,
    addMember,
    removeMember,
    removeSprint,
  } = useSprintBlock({ sprint, devMembers, projectId });

  const today = new Date();
  const start = parseISO(sprint.start_date);
  const end = parseISO(sprint.end_date);
  const isActive = today >= start && today <= end;





  return (
    <div className="hairline rounded-md bg-surface-1/40">
      <div className="h-12 flex items-center gap-3 px-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-dim hover:text-foreground transition"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
        <div className="text-sm font-medium w-16 shrink-0">
          Sprint {sprint.sprint_number}
        </div>
        <div className="text-xs text-dim font-mono shrink-0">
          {format(start, "MMM d")} → {format(end, "MMM d")}
        </div>
        {isActive && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase tracking-wide">
            active
          </span>
        )}
        {stackMembers.length > 0 && (
          <MemberAvatarStack members={stackMembers} size="xs" max={4} />
        )}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {capFE > 0 && <ThinCapBar label="FE" pooled={pooledFE} cap={capFE} />}
          {capBE > 0 && <ThinCapBar label="BE" pooled={pooledBE} cap={capBE} />}
        </div>
        {isPMBA && <EditSprintPopover sprint={sprint} />}
        {isPMBA && (
          <Button
            variant="ghost"
            size="icon"
            onClick={removeSprint}
            className="h-7 w-7"
            title="Delete sprint"
          >
            <Trash2 className="h-3.5 w-3.5 text-dim" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1">
          {addedMembers.length === 0 && (
            <div className="text-[11px] text-dim italic py-1">No members added</div>
          )}
          {addedMembers.map((m) => {
            const ds = memberDisciplines(m.role);
            const pooled = pooledPerDev.get(m.user_id) ?? { FE: 0, BE: 0 };
            return (
              <div
                key={m.user_id}
                className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0"
              >
                <MemberAvatar
                  size="xs"
                  name={m.member.name}
                  color={m.member.avatar_color}
                />
                <div className="text-xs flex-1 truncate">{m.member.name}</div>
                {ds.map((d) => (
                  <DevDisciplineCell
                    key={d}
                    discipline={d}
                    pooled={pooled[d]}
                    cap={capFor(m.user_id, d)}
                    isPMBA={isPMBA}
                    onCommit={(h) => updateCap(m.user_id, d, h)}
                  />
                ))}
                {isPMBA && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(m.user_id)}
                    className="h-6 w-6"
                    title="Remove from sprint"
                  >
                    <X className="h-3 w-3 text-dim" />
                  </Button>
                )}
              </div>
            );
          })}
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
