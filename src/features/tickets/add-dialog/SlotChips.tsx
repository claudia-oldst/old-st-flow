import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { ProjectMember, TeamMember } from "@/lib/types";

export function SlotChips({
  label,
  members,
  selected,
  onToggle,
  showRole,
}: {
  label: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showRole?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-dimmer mb-1.5">{label}</div>
      {members.length === 0 ? (
        <div className="text-xs text-dim p-2 rounded-md bg-white/5 hairline">
          No eligible members.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const active = selected.has(m.user_id);
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => onToggle(m.user_id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition",
                  active
                    ? "bg-foreground text-background"
                    : "bg-white/5 hairline text-foreground hover:bg-white/10"
                )}
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                {showRole && <span className="text-[9px] opacity-60">{m.role}</span>}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
