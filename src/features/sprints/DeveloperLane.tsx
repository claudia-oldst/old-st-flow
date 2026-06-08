import { useDroppable } from "@dnd-kit/core";
import { MemberAvatar } from "@/components/MemberAvatar";
import { PROJECT_ROLE_COLORS } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintTicket, SprintMember, SprintCapacity, SprintDiscipline } from "./types";
import { memberDisciplines, remainingHours, dndId } from "./types";
import { DraggableTicketCard } from "./DraggableTicketCard";
import { cn } from "@/lib/utils";

interface Props {
  member: SprintMember;
  items: Array<{ link: SprintTicket; ticket: TicketRow }>;
  capacities: SprintCapacity[];
  disabled: boolean;
}

export function DeveloperLane({ member, items, capacities, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dndId.laneZone(member.user_id) });
  const disciplines = memberDisciplines(member.role);

  const capFor = (d: SprintDiscipline) =>
    Number(capacities.find((c) => c.user_id === member.user_id && c.discipline === d)?.hours ?? 0);

  const allocated = items.reduce(
    (acc, it) => {
      const r = remainingHours(it.ticket);
      if (disciplines.includes("FE")) acc.FE += r.FE;
      if (disciplines.includes("BE")) acc.BE += r.BE;
      return acc;
    },
    { FE: 0, BE: 0 } as Record<SprintDiscipline, number>,
  );

  const totalCap = disciplines.reduce((s, d) => s + capFor(d), 0);
  const totalAlloc = disciplines.reduce((s, d) => s + allocated[d], 0);
  const overallocated = totalAlloc > totalCap;
  const pct = totalCap > 0 ? Math.min(100, (totalAlloc / totalCap) * 100) : 0;

  return (
    <div className="w-72 shrink-0 flex flex-col rounded-md hairline bg-surface-1/40 overflow-hidden">
      <div className="p-2.5 hairline-b bg-surface-1/60">
        <div className="flex items-center gap-2">
          <MemberAvatar name={member.member.name} color={member.member.avatar_color ?? undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{member.member.name}</div>
            <span
              className={cn(
                "inline-block text-[9px] px-1.5 py-px rounded ring-1 uppercase tracking-wide",
                PROJECT_ROLE_COLORS[member.role],
              )}
            >
              {member.role}
            </span>
          </div>
          <div className="text-right font-mono text-[10px]">
            <div className={cn(overallocated && "text-destructive font-semibold")}>
              {totalAlloc}h / {totalCap}h
            </div>
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
          <div
            className={cn("h-full transition-all", overallocated ? "bg-destructive" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-32 overflow-y-auto p-2 space-y-1.5 transition",
          isOver && "bg-primary/10 ring-1 ring-primary/40 ring-inset",
        )}
      >
        {items.length === 0 && (
          <div className="text-[10px] text-dim text-center py-4">Drop here</div>
        )}
        {items.map((it) => (
          <DraggableTicketCard
            key={it.link.id}
            ticket={it.ticket}
            dndId={dndId.laneCard(it.link.id, member.user_id)}
            variant="lane"
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
