import { AlertTriangle } from "lucide-react";
import { cn, formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { ExtraColumn } from "@/features/tickets/TicketsList";
import type { SprintDiscipline } from "../types";
import { SprintCell } from "./SprintCell";
import { cellState, type CellState, type Commitment, type SprintLite } from "./cellRules";
import type { Load, SprintTotals } from "./sprintTotals";

const DISCS = ["FE", "BE"] as const;

function Totals({ l, cap }: { l: Load | undefined; cap: number }) {
  const used = (l?.committed ?? 0) + (l?.planned ?? 0);
  return (
    <div className="normal-case tracking-normal text-[10px] leading-tight mt-0.5">
      <div>C {l?.committedCount ?? 0} · P {l?.plannedCount ?? 0}</div>
      <div className={cn("font-mono", cap > 0 && used > cap && "text-primary")}>{formatHours(used)}/{formatHours(cap)}</div>
    </div>
  );
}

interface Args {
  sprints: SprintLite[];
  workingId: string | undefined;
  totals: Map<string, SprintTotals>;
  caps: Map<string, { FE: number; BE: number }>;
  commitsByTicket: Map<string, Commitment[]>;
  plannedByTicket: Map<string, { fe: string | null; be: string | null }>;
  isSplit: (t: TicketRow) => boolean;
  editable: boolean;
  onSet: (t: TicketRow, s: SprintLite, d: SprintDiscipline, to: CellState) => void;
}

/** Sprint × FE/BE cells appended to the shared tickets table. */
export function sprintColumns(a: Args): ExtraColumn[] {
  const warn: ExtraColumn = {
    key: "split", header: "", width: 28,
    cell: (t) => a.isSplit(t) ? <span title="Only one discipline is in the working sprint"><AlertTriangle className="h-3 w-3 text-brand-gold" /></span> : null,
  };
  return [warn, ...a.sprints.flatMap((s) => DISCS.map((d): ExtraColumn => {
    const working = s.id === a.workingId;
    return {
      key: `${s.id}-${d}`, width: 92,
      headerClassName: cn(working && "bg-accent/[0.06] text-accent"),
      header: (
        <div>
          <div className="normal-case">S{s.sprint_number} {d}</div>
          <Totals l={a.totals.get(s.id)?.sprint[d]} cap={a.caps.get(s.id)?.[d] ?? 0} />
        </div>
      ),
      cell: (t) => {
        const cs = (a.commitsByTicket.get(t.id) ?? []).filter((c) => c.discipline === d);
        const p = a.plannedByTicket.get(t.id);
        const state = cellState({ sprint: s, plannedId: (d === "FE" ? p?.fe : p?.be) ?? null, commitments: cs });
        return (
          <SprintCell
            state={state}
            noHours={false}
            working={working}
            editable={a.editable}
            onSet={(to) => a.onSet(t, s, d, to)}
          />
        );
      },
    };
  }))];
}
