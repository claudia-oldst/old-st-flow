import { useMemo } from "react";
import { formatHours, cn } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";

interface EpicLite {
  id: number;
  epic_name: string | null;
}

interface Props {
  projectId: string;
  tickets: TicketRow[];
  statuses: Status[];
  epics: EpicLite[];
}

type Risk = "at_risk" | "watch" | "healthy";

interface EpicRiskRow {
  epicId: number;
  name: string;
  total: number;
  done: number;
  devDone: number;
  active: number;
  backlog: number;
  currentEst: number;
  actualHours: number;
  burnPct: number;
  progressPct: number;
  risk: Risk;
}

function computeRisk(row: Omit<EpicRiskRow, "risk">): Risk {
  const { burnPct, done, devDone, active, backlog, total, currentEst } = row;
  if (total === 0 || currentEst === 0) return "healthy";
  const effectiveProgress = ((done + devDone + active * 0.3) / total) * 100;
  const burnAhead = burnPct - effectiveProgress;
  if (burnAhead > 35) return "at_risk";
  if (burnAhead > 15 || (backlog / total > 0.7 && burnPct > 25)) return "watch";
  return "healthy";
}

const riskOrder: Record<Risk, number> = { at_risk: 0, watch: 1, healthy: 2 };

export function EpicRiskTable({ tickets, statuses, epics }: Props) {
  const rows = useMemo<EpicRiskRow[]>(() => {
    const catById = new Map<string, string>();
    for (const s of statuses) catById.set(s.id, s.category);

    const result: EpicRiskRow[] = [];
    for (const e of epics) {
      const epicTickets = tickets.filter(
        (t) =>
          t.epic_id === e.id &&
          !(t.ticket_type === "CR" && t.cr_approval !== "approved"),
      );
      let done = 0,
        devDone = 0,
        active = 0,
        backlog = 0,
        unknown = 0;
      let currentEst = 0;
      let actualHours = 0;
      for (const t of epicTickets) {
        const cat = t.status_id ? catById.get(t.status_id) : undefined;
        if (cat === "done") done++;
        else if (cat === "dev done") devDone++;
        else if (cat === "active") active++;
        else if (cat === "backlog") backlog++;
        else unknown++;
        currentEst +=
          t.current_fe_estimate + t.current_be_estimate + t.current_project_estimate;
        actualHours +=
          t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours;
      }
      // Exclude unknown-status tickets from totals used for risk math.
      const total = done + devDone + active + backlog;
      if (total === 0 || currentEst === 0) continue;
      const burnPct = Math.min(150, (actualHours / currentEst) * 100);
      const progressPct = ((done + devDone) / total) * 100;
      const base = {
        epicId: e.id,
        name: e.epic_name ?? "Untitled epic",
        total,
        done,
        devDone,
        active,
        backlog,
        currentEst,
        actualHours,
        burnPct,
        progressPct,
      };
      result.push({ ...base, risk: computeRisk(base) });
    }
    result.sort((a, b) => {
      const r = riskOrder[a.risk] - riskOrder[b.risk];
      if (r !== 0) return r;
      return b.burnPct - a.burnPct;
    });
    return result;
  }, [tickets, statuses, epics]);

  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="text-xs uppercase tracking-wider text-dimmer mb-2">
          Epic risk — doneness vs estimate burn
        </div>
        <div className="text-sm text-dim">No epics with estimates yet.</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="text-xs uppercase tracking-wider text-dimmer">
          Epic risk — doneness vs estimate burn
        </div>
        <div className="flex items-center gap-3 text-[10px] text-dimmer">
          <LegendDot className="bg-health-good" label="Done" />
          <LegendDot className="bg-health-good/50" label="Dev done" />
          <LegendDot className="bg-health-warn" label="Active" />
          <LegendDot className="bg-white/10" label="Backlog" />
          <span className="w-px h-3 bg-white/10" />
          <LegendDot className="bg-health-bad" label="Burned" />
        </div>
      </div>

      <div className="grid grid-cols-[2fr_3fr_3fr_auto] gap-4 px-2 pb-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
        <div>Epic</div>
        <div>Doneness</div>
        <div>Estimate burn</div>
        <div>Risk</div>
      </div>

      <div className="space-y-3 pt-3">
        {rows.map((row) => (
          <div
            key={row.epicId}
            className="grid grid-cols-[2fr_3fr_3fr_auto] gap-4 items-center px-2 py-2 rounded-lg hover:bg-white/[0.02] transition"
          >
            <div className="text-sm truncate" title={row.name}>
              {row.name}
            </div>

            <div>
              <SegmentedBar
                segments={[
                  { pct: (row.done / row.total) * 100, className: "bg-health-good" },
                  { pct: (row.devDone / row.total) * 100, className: "bg-health-good/50" },
                  { pct: (row.active / row.total) * 100, className: "bg-health-warn" },
                  { pct: (row.backlog / row.total) * 100, className: "bg-white/10" },
                ]}
              />
              <div className="mt-1 text-[10px] text-dimmer font-mono flex gap-2 flex-wrap">
                <span className="text-dim font-medium">{Math.round(row.progressPct)}%</span>
                <span>{row.done} done</span>
                {row.devDone > 0 && <span>{row.devDone} dev done</span>}
                {row.active > 0 && <span>{row.active} active</span>}
                <span>{row.backlog} backlog</span>
              </div>
            </div>

            <div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    row.burnPct > 100
                      ? "bg-health-bad"
                      : row.burnPct > 80
                      ? "bg-health-warn"
                      : "bg-health-good",
                  )}
                  style={{ width: `${Math.min(100, row.burnPct)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-dimmer font-mono">
                {Math.round(row.burnPct)}% burned · {formatHours(row.actualHours)} /{" "}
                {formatHours(row.currentEst)}
              </div>
            </div>

            <RiskPill risk={row.risk} />
          </div>
        ))}
      </div>
    </div>
  );
}


function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-sm", className)} />
      {label}
    </span>
  );
}

function RiskPill({ risk }: { risk: Risk }) {
  const map: Record<Risk, { cls: string; label: string }> = {
    at_risk: { cls: "bg-health-bad/15 text-health-bad ring-health-bad/30", label: "At risk" },
    watch: { cls: "bg-health-warn/15 text-health-warn ring-health-warn/30", label: "Watch" },
    healthy: { cls: "bg-health-good/15 text-health-good ring-health-good/30", label: "Healthy" },
  };
  const { cls, label } = map[risk];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full ring-1 text-[11px] font-medium whitespace-nowrap",
        cls,
      )}
    >
      {label}
    </span>
  );
}
