import { Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { ProjectMember, TeamMember, TicketType } from "@/lib/types";
import type { DraftAssignees } from "./types";
import { SlotChips } from "./SlotChips";

export function AssignPopover({
  members,
  type,
  assignees,
  onChange,
  count,
}: {
  members: (ProjectMember & { member: TeamMember })[];
  type: TicketType;
  assignees: DraftAssignees;
  onChange: (a: DraftAssignees) => void;
  count: number;
}) {
  const isProj = type === "Proj";
  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");
  const projectEligible = members;

  const toggle = (slot: keyof DraftAssignees, id: string) => {
    const next: DraftAssignees = {
      fe: new Set(assignees.fe),
      be: new Set(assignees.be),
      project: new Set(assignees.project),
    };
    if (next[slot].has(id)) next[slot].delete(id);
    else next[slot].add(id);
    onChange(next);
  };

  const previewMembers: (TeamMember | undefined)[] = [];
  const collect = (set: Set<string>) =>
    set.forEach((uid) => {
      const m = members.find((x) => x.user_id === uid)?.member;
      if (m) previewMembers.push(m);
    });
  collect(assignees.fe);
  collect(assignees.be);
  collect(assignees.project);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full inline-flex items-center justify-between gap-2 px-2.5 rounded-md hairline bg-white/[0.02] hover:bg-white/[0.05] transition text-xs"
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 text-dimmer shrink-0" />
            {count === 0 ? (
              <span className="text-dimmer">Assign</span>
            ) : (
              <span className="flex -space-x-1.5">
                {previewMembers.slice(0, 3).map((m, i) => (
                  <MemberAvatar key={i} name={m!.name} color={m!.avatar_color} size="xs" />
                ))}
              </span>
            )}
          </span>
          {count > 0 && <span className="text-dimmer font-mono">{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3 space-y-4 max-h-[60vh] overflow-y-auto" align="end">
        {isProj ? (
          <SlotChips
            label="Team members"
            members={projectEligible}
            selected={assignees.project}
            onToggle={(id) => toggle("project", id)}
            showRole
          />
        ) : (
          <>
            <SlotChips
              label="Frontend"
              members={feEligible}
              selected={assignees.fe}
              onToggle={(id) => toggle("fe", id)}
            />
            <SlotChips
              label="Backend"
              members={beEligible}
              selected={assignees.be}
              onToggle={(id) => toggle("be", id)}
            />
            <SlotChips
              label="Project contributors"
              members={projectEligible}
              selected={assignees.project}
              onToggle={(id) => toggle("project", id)}
              showRole
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
