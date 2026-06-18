import { Check } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { ProjectMember, TeamMember } from "@/lib/types";

interface Props {
  label: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  partial?: Set<string>;
  onToggle: (id: string) => void;
}

export function BulkAssignSlot({ label, members, selected, partial, onToggle }: Props) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-dimmer mb-2">{label}</div>
      {members.length === 0 ? (
        <div className="text-sm text-dim p-3 rounded-lg bg-white/5 hairline">
          No eligible project members.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const active = selected.has(m.user_id);
            const isPartial = active && !!partial?.has(m.user_id);
            return (
              <button
                key={m.user_id}
                onClick={() => onToggle(m.user_id)}
                className={cn(
                  "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm transition relative",
                  active
                    ? isPartial
                      ? "bg-primary/20 text-foreground ring-1 ring-primary/60"
                      : "bg-foreground text-background"
                    : "bg-white/5 hairline text-dim hover:text-foreground hover:bg-white/10 opacity-70"
                )}
                title={
                  isPartial
                    ? "Assigned to some of the selected tickets — click to remove from all"
                    : active
                    ? "Assigned — click to remove"
                    : "Not assigned — click to assign"
                }
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                <span className="text-[10px] opacity-60">{m.role}</span>
                {isPartial ? (
                  <span className="text-[10px] font-mono px-1 rounded bg-primary/30 text-foreground">
                    partial
                  </span>
                ) : active ? (
                  <Check className="h-3 w-3" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
