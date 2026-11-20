import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { MemberAvatarStack } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import { MultiSelectFilter } from "@/features/_shared/filters/MultiSelectFilter";
import type { SprintMember } from "../types";
import { ThinCapBar } from "../sprint-block/ThinCapBar";
import { SprintCapacityPanel } from "./SprintCapacityPanel";
import { isClosed, type SprintLite } from "./cellRules";
import type { SprintTotals } from "./sprintTotals";

interface Props {
  sprints: SprintLite[];
  working: SprintLite | undefined;
  onPick: (id: string) => void;
  today: string;
  members: SprintMember[];
  totals: SprintTotals | undefined;
  caps: { FE: number; BE: number; byUser: Map<string, { FE: number; BE: number }> } | undefined;
  activeDevIds: string[];
  onDevClick: (userId: string) => void;
}

/** Working-sprint pills plus the collapsible capacity panel for that sprint. */
export function WorkingSprintBar({ sprints, working, onPick, today, members, totals, caps, activeDevIds, onDevClick }: Props) {
  const [open, setOpen] = useState(true);
  const inSprint = members.filter((m) => caps?.byUser.has(m.user_id));
  const [shown, setShown] = useState<string[]>([]);
  const visible = shown.length ? inSprint.filter((m) => shown.includes(m.user_id)) : inSprint;
  const isActive = (s: SprintLite) => s.start_date <= today && s.end_date >= today;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-dimmer mr-1">Working in:</span>
        {sprints.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className={cn(
              "h-7 px-2.5 rounded-full text-xs hairline transition",
              s.id === working?.id ? "bg-accent/15 text-accent border-accent/40" : "text-dim hover:text-foreground",
            )}
          >
            S{s.sprint_number}
            {isClosed(s, today) && <span className="ml-1 text-[10px] text-dimmer">closed</span>}
            {isActive(s) && <span className="ml-1 text-[10px] text-health-good">active</span>}
          </button>
        ))}
      </div>
      {working && (
        <div className="sticky top-0 z-20 hairline rounded-md bg-surface-1/95 backdrop-blur px-3 py-2 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium">
              <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
              Sprint {working.sprint_number}
            </button>
            <span className="text-xs text-dim font-mono">{format(parseISO(working.start_date), "d MMM")} → {format(parseISO(working.end_date), "d MMM")}</span>
            <MemberAvatarStack members={inSprint.map((m) => ({ id: m.user_id, name: m.member.name, avatar_color: m.member.avatar_color }))} size="xs" max={6} />
            <div className="flex-1 flex items-center gap-6 min-w-[300px]">
              <div className="w-56"><ThinCapBar wide label="FE" committed={totals?.sprint.FE.committed ?? 0} planned={totals?.sprint.FE.planned ?? 0} cap={caps?.FE ?? 0} /></div>
              <div className="w-56"><ThinCapBar wide label="BE" committed={totals?.sprint.BE.committed ?? 0} planned={totals?.sprint.BE.planned ?? 0} cap={caps?.BE ?? 0} /></div>
            </div>
            <MultiSelectFilter label="Developers" options={inSprint.map((m) => ({ value: m.user_id, label: m.member.name }))} selected={shown} onChange={setShown} searchable />
          </div>
          {open && (
            <SprintCapacityPanel
              members={visible}
              totals={totals}
              capFor={(u, d) => caps?.byUser.get(u)?.[d] ?? 0}
              activeIds={activeDevIds}
              onDevClick={onDevClick}
            />
          )}
        </div>
      )}
    </div>
  );
}
