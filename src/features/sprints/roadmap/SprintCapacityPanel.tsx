import type { ReactNode } from "react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import { memberDisciplines, type SprintDiscipline, type SprintMember } from "../types";
import { ThinCapBar } from "../sprint-block/ThinCapBar";
import type { SprintTotals } from "./sprintTotals";

interface Props {
  members: SprintMember[];
  totals: SprintTotals | undefined;
  capFor: (userId: string, d: SprintDiscipline) => number;
  /** Highlighted (filtered) developers. */
  activeIds?: string[];
  onDevClick?: (userId: string) => void;
  /** Extra controls per row (capacity inputs on the Sprints tab). */
  rowExtra?: (m: SprintMember, d: SprintDiscipline) => ReactNode;
  rowEnd?: (m: SprintMember) => ReactNode;
}

/** One row per developer: committed + planned load against their capacity. */
export function SprintCapacityPanel({ members, totals, capFor, activeIds = [], onDevClick, rowExtra, rowEnd }: Props) {
  if (members.length === 0) return <div className="text-[11px] text-dim italic py-1">No members added</div>;
  return (
    <div className="space-y-0.5">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3 py-1 border-b border-white/5 last:border-0">
          <button
            type="button"
            disabled={!onDevClick}
            onClick={() => onDevClick?.(m.user_id)}
            className={cn(
              "flex items-center gap-2 w-40 shrink-0 text-left rounded px-1 -mx-1",
              onDevClick && "hover:bg-white/5",
              activeIds.includes(m.user_id) && "bg-accent/15 text-accent",
            )}
            title={onDevClick ? "Filter the table to their tickets" : undefined}
          >
            <MemberAvatar size="xs" memberId={m.user_id} name={m.member.name} color={m.member.avatar_color} />
            <span className="text-xs truncate">{m.member.name}</span>
          </button>
          <div className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-1">
            {memberDisciplines(m.role).map((d) => {
              const load = totals?.perDev.get(m.user_id)?.[d];
              const c = load?.committed ?? 0;
              const p = load?.planned ?? 0;
              const cap = capFor(m.user_id, d);
              const over = c + p - cap;
              return (
                <div key={d} className="flex items-center gap-2 min-w-[320px]">
                  <div className="w-44"><ThinCapBar label={d} committed={c} planned={p} cap={cap} /></div>
                  <span className={cn("text-[11px] text-dim font-mono whitespace-nowrap", over > 0 && "text-primary")}>
                    {formatHours(c)} committed · {formatHours(p)} planned / {formatHours(cap)}
                    {over > 0 && ` · +${formatHours(over)} over`}
                  </span>
                  {rowExtra?.(m, d)}
                </div>
              );
            })}
          </div>
          {rowEnd?.(m)}
        </div>
      ))}
    </div>
  );
}
