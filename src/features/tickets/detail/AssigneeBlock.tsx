import { MemberAvatar } from "@/components/MemberAvatar";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

export function AssigneeBlock({ label, assignees }: { label: string; assignees: TicketRow["assignees"] }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-16 text-xs text-dimmer">{label}</div>
      {assignees.length === 0 ? (
        <span className="text-xs text-dimmer">—</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {assignees.map((a) => (
            <div key={a.user_id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hairline text-xs">
              <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
              {a.member.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
