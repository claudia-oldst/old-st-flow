import { useMemo, useState } from "react";
import { formatHours, cn } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type SortKey =
  | "originalEst"
  | "currentEst"
  | "actualHours"
  | "delta"
  | "burnPct"
  | "progressPct"
  | "name";

interface EpicRiskRow {
  epicId: number;
  name: string;
  total: number;
  done: number;
  devDone: number;
  active: number;
  backlog: number;
  currentEst: number;
  originalEst: number;
  baselineEst: number;
  actualHours: number;
  delta: number;
  burnPct: number;
  progressPct: number;
  risk: Risk;
}

function computeRisk(row: Omit<EpicRiskRow, "risk">): Risk {
  const { burnPct, done, devDone, active, backlog, total, baselineEst, actualHours } = row;
  if (total === 0) return "healthy";
  if (baselineEst === 0) return actualHours > 0 ? "at_risk" : "healthy";
  const effectiveProgress = ((done + devDone + active * 0.3) / total) * 100;
  const burnAhead = burnPct - effectiveProgress;
  if (burnAhead > 35) return "at_risk";
  if (burnAhead > 15 || (backlog / total > 0.7 && burnPct > 25)) return "watch";
  return "healthy";
}

const SORT_LABELS: Record<SortKey, string> = {
  originalEst: "Original Estimate Size",
  currentEst: "Current Estimate Size",
  actualHours: "Actual Logs",
  delta: "Current vs Original Delta",
  burnPct: "% Burned",
  progressPct: "% Done",
  name: "A-Z",
};

export function EpicRiskTable({ tickets, statuses, epics }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "burnPct",
    dir: "desc",
  });

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
      let originalEst = 0;
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
        originalEst +=
          (t.original_fe_estimate ?? 0) +
          (t.original_be_estimate ?? 0) +
          (t.original_project_estimate ?? 0);
        actualHours +=
          t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours;
      }
      // Exclude unknown-status tickets from totals used for risk math.
      const total = done + devDone + active + backlog;
      if (total === 0) continue;
      // Burn is measured against the ORIGINAL baseline; fall back to current
      // when no original estimate was ever captured.
      const baselineEst = originalEst > 0 ? originalEst : currentEst;
      // Uncapped: a 900%-burned epic must not read the same as a 160% one.
      const burnPct = baselineEst === 0 ? 0 : (actualHours / baselineEst) * 100;
      const progressPct = ((done + devDone) / total) * 100;
      const delta = currentEst - originalEst;
      const base = {
        epicId: e.id,
        name: e.epic_name ?? "Untitled epic",
        total,
        done,
        devDone,
        active,
        backlog,
        currentEst,
        originalEst,
        baselineEst,
        actualHours,
        delta,
        burnPct,
        progressPct,
      };
      result.push({ ...base, risk: computeRisk(base) });
    }
    result.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const key = sort.key;
      if (key === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      return (a[key] - b[key]) * dir;
    });
    return result;
  }, [tickets, statuses, epics, sort]);

  const toggleDir = () => {
    setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }));
  };

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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={sort.key}
              onValueChange={(v) =>
                setSort({
                  key: v as SortKey,
                  dir: v === "name" ? "asc" : "desc",
                })
              }
            >
              <SelectTrigger className="h-8 min-w-[10rem] w-auto text-xs bg-surface-2 border-white/10 hover:border-white/20">
                <span className="text-dim mr-1">Sort by</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-2 border-white/10">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {SORT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={toggleDir}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 bg-surface-2 text-dim hover:text-foreground hover:border-white/20 transition"
              aria-label={`Sort ${sort.dir === "asc" ? "ascending" : "descending"}`}
            >
              {sort.dir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
            </button>
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
                    row.baselineEst === 0 || row.burnPct > 100
                      ? "bg-health-bad"
                      : row.burnPct > 80
                      ? "bg-health-warn"
                      : "bg-health-good",
                  )}
                  style={{
                    width: `${row.baselineEst === 0 ? (row.actualHours > 0 ? 100 : 0) : Math.min(100, row.burnPct)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[10px] text-dimmer font-mono">
                {row.baselineEst === 0 ? (
                  <>
                    no estimate · {formatHours(row.actualHours)} logged
                  </>
                ) : (
                  <>
                    {Math.round(row.burnPct)}% burned · {formatHours(row.actualHours)} /{" "}
                    {formatHours(row.baselineEst)}
                    {row.currentEst !== row.baselineEst && (
                      <span className="text-dim"> (current {formatHours(row.currentEst)})</span>
                    )}
                  </>
                )}
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
