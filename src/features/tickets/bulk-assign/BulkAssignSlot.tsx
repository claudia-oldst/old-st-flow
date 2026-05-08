import { Check } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { ProjectMember, TeamMember } from "@/lib/types";

interface Props {
  label: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function BulkAssignSlot({ label, members, selected, onToggle }: Props) {
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
            return (
              <button
                key={m.user_id}
                onClick={() => onToggle(m.user_id)}
                className={cn(
                  "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm transition",
                  active
                    ? "bg-foreground text-background"
                    : "bg-white/5 hairline text-foreground hover:bg-white/10"
                )}
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                <span className="text-[10px] opacity-60">{m.role}</span>
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
