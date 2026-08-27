import { Check } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Chip list for picking members for one assignee slot. */
export function SlotPicker({
  label,
  description,
  members,
  selected,
  onToggle,
  showRole,
}: {
  label: string;
  description?: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showRole?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-dimmer mb-1">{label}</div>
      {description && <div className="text-[11px] text-dimmer mb-2">{description}</div>}
      {members.length === 0 ? (
        <div className="text-sm text-dim p-3 rounded-lg bg-white/5 hairline">
          No project members available. Add one in the Team tab.
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
                    : "bg-white/5 hairline text-foreground hover:bg-white/10",
                )}
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                {showRole && <span className="text-[10px] opacity-60">{m.role}</span>}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
