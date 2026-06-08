import { useDroppable } from "@dnd-kit/core";
import type { Ticket } from "@/lib/types";
import type { SprintTicket, SprintMember, SprintCapacity, SprintDiscipline } from "./types";
import { memberDisciplines, remainingHours, dndId } from "./types";
import { TicketCard } from "./TicketCard";
import { cn } from "@/lib/utils";

interface Props {
  member: SprintMember;
  items: Array<SprintTicket & { ticket: Ticket }>;
  capacities: SprintCapacity[];
  disabled: boolean;
}

export function DeveloperLane({ member, items, capacities, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dndId.laneZone(member.user_id) });
  const disciplines = memberDisciplines(member.role);

  // Capacity by discipline for this user
  const capFor = (d: SprintDiscipline) =>
    Number(capacities.find((c) => c.user_id === member.user_id && c.discipline === d)?.hours ?? 0);

  // Allocated remaining-hours by discipline (only across items assigned to this user)
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
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{member.member.name}</div>
            <div className="text-[10px] text-dim uppercase tracking-wide">{member.role}</div>
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
        {items.map((it) => {
          // pick the discipline to isolate — first of dev's disciplines that has remaining
          const r = remainingHours(it.ticket);
          let iso: SprintDiscipline | undefined;
          for (const d of disciplines) {
            if (r[d] > 0) {
              iso = d;
              break;
            }
          }
          if (!iso) iso = disciplines[0];
          return (
            <TicketCard
              key={it.id}
              ticket={it.ticket}
              dndId={dndId.laneCard(it.id, member.user_id)}
              isolate={iso}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}
