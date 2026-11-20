import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import { DISCIPLINE_STATUS_COLOR, DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintDiscipline } from "../types";
import { SprintCell } from "./SprintCell";
import { cellState, type CellState, type Commitment, type SprintLite } from "./cellRules";

export const ROW_GRID = (n: number) => `28px 92px minmax(220px,1fr) 104px 128px 84px 108px repeat(${n}, 76px)`;

interface Props {
  t: TicketRow;
  sprints: SprintLite[];
  workingId: string | undefined;
  commits: Commitment[];
  planned: { fe: string | null; be: string | null } | undefined;
  status: { name: string; color: string } | undefined;
  split: boolean;
  selected: boolean;
  editable: boolean;
  onSelect: (id: string, on: boolean) => void;
  onOpen: (t: TicketRow) => void;
  onAssign: (t: TicketRow) => void;
  onSet: (t: TicketRow, s: SprintLite, d: SprintDiscipline, to: CellState) => void;
}

const est = (t: TicketRow, d: SprintDiscipline) => (d === "FE" ? t.current_fe_estimate : t.current_be_estimate) || 0;
const act = (t: TicketRow, d: SprintDiscipline) => (d === "FE" ? t.actual_frontend_hours : t.actual_backend_hours) || 0;

function DiscStatus({ t, d }: { t: TicketRow; d: SprintDiscipline }) {
  if (est(t, d) <= 0) return <span className="text-dimmer">{d} –</span>;
  const s = (d === "FE" ? t.fe_status : t.be_status) as DisciplineStatus;
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-dimmer w-5">{d}</span>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: DISCIPLINE_STATUS_COLOR[s] }} />
      {DISCIPLINE_STATUS_LABEL[s]}
    </span>
  );
}

export const RoadmapRow = memo(function RoadmapRow(p: Props) {
  const { t } = p;
  const slot = (d: SprintDiscipline) => t.assignees.filter((a) => a.slot === d);
  return (
    <div
      className={cn("grid items-center gap-x-2 px-2 min-h-[44px] border-b border-white/5 text-xs hover:bg-white/[0.02]", p.selected && "bg-accent/5")}
      style={{ gridTemplateColumns: ROW_GRID(p.sprints.length * 2), contentVisibility: "auto", containIntrinsicSize: "auto 44px" }}
    >
      <Checkbox checked={p.selected} onCheckedChange={(v) => p.onSelect(t.id, !!v)} aria-label={`Select ${t.formatted_id}`} />
      <button type="button" onClick={() => p.onOpen(t)} className="font-mono text-[11px] text-dim hover:text-accent text-left truncate">{t.formatted_id}</button>
      <div className="flex items-center gap-1.5 min-w-0">
        {p.split && <span title="Only one discipline is in the working sprint"><AlertTriangle className="h-3 w-3 text-brand-gold shrink-0" /></span>}
        <button type="button" onClick={() => p.onOpen(t)} className="truncate text-left hover:text-accent" title={t.title}>{t.title}</button>
      </div>
      <span className="flex items-center gap-1.5 truncate text-[11px] uppercase">
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.status?.color }} />
        <span className="truncate">{p.status?.name ?? "—"}</span>
      </span>
      <div className="flex flex-col gap-0.5 text-[11px]"><DiscStatus t={t} d="FE" /><DiscStatus t={t} d="BE" /></div>
      <button type="button" disabled={!p.editable} onClick={() => p.onAssign(t)} className="flex flex-col gap-0.5 text-left disabled:cursor-default" aria-label="Assign people">
        {(["FE", "BE"] as const).map((d) => (
          <span key={d} className="flex items-center gap-1 text-[10px]">
            <span className="text-dimmer w-5">{d}</span>
            {slot(d).length ? slot(d).map((a) => <MemberAvatar key={a.user_id} memberId={a.user_id} name={a.member.name} color={a.member.avatar_color} size="xs" className="h-4 w-4" />) : <span className="text-dimmer">—</span>}
          </span>
        ))}
      </button>
      <div className="flex flex-col gap-0.5 font-mono text-[11px]">
        {(["FE", "BE"] as const).map((d) => (
          <span key={d} className={cn(act(t, d) > est(t, d) && "text-primary")}>
            <span className="text-dimmer">{d} </span>{formatHours(act(t, d))}/{formatHours(est(t, d))}
          </span>
        ))}
      </div>
      {p.sprints.flatMap((s) =>
        (["FE", "BE"] as const).map((d) => {
          const cs = p.commits.filter((c) => c.discipline === d);
          const state = cellState({ sprint: s, plannedId: (d === "FE" ? p.planned?.fe : p.planned?.be) ?? null, commitments: cs });
          return (
            <SprintCell
              key={`${s.id}${d}`}
              state={state}
              unplanned={state === "committed" && cs.some((c) => c.sprint_id === s.id && c.unplanned)}
              noHours={est(t, d) <= 0 || t.ticket_type === "Proj"}
              working={s.id === p.workingId}
              editable={p.editable}
              onSet={(to) => p.onSet(t, s, d, to)}
            />
          );
        }),
      )}
    </div>
  );
});
