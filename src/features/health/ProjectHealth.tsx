import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { formatHours, healthRatio } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import { TrendingUp, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { EstimateEvolution } from "@/features/health/EstimateEvolution";

export function ProjectHealth({ projectId }: { projectId: string }) {
  const { tickets } = useProjectTickets(projectId);
  const { statuses } = useStatuses();
  const [members, setMembers] = useState<{ user_id: string; role: string; member: { id: string; name: string; avatar_color: string } }[]>([]);
  const [weekHours, setWeekHours] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from("project_members")
      .select("user_id,role,member:team_members(id,name,avatar_color)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers((data as any) ?? []));

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const ticketIds = tickets.map((t) => t.id);
    if (ticketIds.length === 0) {
      setWeekHours({});
      return;
    }
    supabase
      .from("time_logs")
      .select("user_id,hours")
      .in("ticket_id", ticketIds)
      .gte("logged_at", since.toISOString())
      .then(({ data }) => {
        const map: Record<string, number> = {};
        data?.forEach((l) => {
          map[l.user_id] = (map[l.user_id] ?? 0) + Number(l.hours);
        });
        setWeekHours(map);
      });
  }, [projectId, tickets]);

  const openTickets = useMemo(() => {
    const doneIds = new Set(statuses.filter((s) => s.category === "done").map((s) => s.id));
    return tickets.filter((t) => !doneIds.has(t.status_id ?? ""));
  }, [tickets, statuses]);

  // Unassigned uses project-level status; member capacity uses per-discipline status.
  const unassignedOpen = openTickets;

  const totals = useMemo(() => {
    return tickets.reduce(
      (acc, t) => {
        acc.feEst += t.current_fe_estimate;
        acc.beEst += t.current_be_estimate;
        acc.feOrig += t.original_fe_estimate;
        acc.beOrig += t.original_be_estimate;
        acc.feAct += t.actual_frontend_hours;
        acc.beAct += t.actual_backend_hours;
        acc.over += t.actual_overhead_hours;
        return acc;
      },
      { feEst: 0, beEst: 0, feOrig: 0, beOrig: 0, feAct: 0, beAct: 0, over: 0 }
    );
  }, [tickets]);

  const totalEst = totals.feEst + totals.beEst;
  const totalOrig = totals.feOrig + totals.beOrig;
  const totalAct = totals.feAct + totals.beAct;
  const overall = healthRatio(totalAct, totalEst);
  const profitabilityPct = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0;
  const profitabilityOrigPct = totalOrig > 0 ? Math.round((totalAct / totalOrig) * 100) : 0;

  const unassignedCount = unassignedOpen.filter((t) => t.assignees.length === 0).length;

  // A ticket counts toward a member's capacity only if THEIR discipline slot is not done.
  const ticketsByMember = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.user_id] = 0));
    tickets.forEach((t) => {
      t.assignees.forEach((a) => {
        const slotStatus = a.slot === "FE" ? t.fe_status : t.be_status;
        if (slotStatus !== "done") {
          map[a.user_id] = (map[a.user_id] ?? 0) + 1;
        }
      });
    });
    return map;
  }, [tickets, members]);

  // Sum of remaining hours per member, scoped to their slot, only for active (non-done) slots.
  const remainingByMember = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.user_id] = 0));
    tickets.forEach((t) => {
      t.assignees.forEach((a) => {
        if (a.slot === "FE" && t.fe_status !== "done") {
          const remaining = Math.max(0, t.current_fe_estimate - t.actual_frontend_hours);
          map[a.user_id] = (map[a.user_id] ?? 0) + remaining;
        } else if (a.slot === "BE" && t.be_status !== "done") {
          const remaining = Math.max(0, t.current_be_estimate - t.actual_backend_hours);
          map[a.user_id] = (map[a.user_id] ?? 0) + remaining;
        }
      });
    });
    return map;
  }, [tickets, members]);

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Ring title="Frontend" actual={totals.feAct} estimate={totals.feEst} original={totals.feOrig} />
        <Ring title="Backend" actual={totals.beAct} estimate={totals.beEst} original={totals.beOrig} />
        <div className="glass rounded-2xl p-5 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Profitability</div>
          <div className="flex items-center gap-3">
            <ProfitabilityPill state={overall} />
            <div>
              <div className="text-2xl font-semibold font-mono ticker">{profitabilityPct}%</div>
              <div className="text-xs text-dim">of estimate burned</div>
              {totalOrig > 0 && (
                <div className="text-[11px] text-dimmer mt-0.5 font-mono">
                  {profitabilityOrigPct}% <span className="font-sans">of original</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto pt-4 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-dimmer">Total est.</div>
              <div className="font-mono">{formatHours(totalEst)}</div>
            </div>
            <div>
              <div className="text-dimmer">Original</div>
              <div className="font-mono">{totalOrig > 0 ? formatHours(totalOrig) : "—"}</div>
            </div>
            <div>
              <div className="text-dimmer">Total actual</div>
              <div className="font-mono">{formatHours(totalAct)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wider text-dimmer">Member capacity</div>
          </div>
          {members.length === 0 ? (
            <div className="text-sm text-dim">No members yet.</div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-3 px-2 pb-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
                <div className="w-7 shrink-0" />
                <div className="flex-1">Member</div>
                <div className="w-14 text-right">Open tix</div>
                <div className="w-20 text-right">Assigned</div>
                <div className="w-16 text-right">Logged</div>
              </div>
              <div className="space-y-2 pt-2">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition">
                    <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="sm" />
                    <div className="flex-1">
                      <div className="text-sm">{m.member.name}</div>
                      <div className="text-[10px] text-dimmer">{m.role}</div>
                    </div>
                    <div className="text-xs font-mono text-dim w-14 text-right" title="Open tickets assigned to this member">
                      <span className="text-foreground">{ticketsByMember[m.user_id] ?? 0}</span>
                    </div>
                    <div className="text-xs font-mono text-dim w-20 text-right" title="Remaining hours on assigned active tickets">
                      <span className="text-foreground">{formatHours(remainingByMember[m.user_id] ?? 0)}</span>
                    </div>
                    <div className="text-xs font-mono text-dim w-16 text-right" title="Hours logged in the last 7 days">
                      {formatHours(weekHours[m.user_id] ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Overhead</div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-300" />
              <div className="text-2xl font-semibold font-mono ticker">{formatHours(totals.over)}</div>
            </div>
            <div className="text-xs text-dim mt-1">QA / PMBA hours (not in estimates)</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Unassigned backlog</div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${unassignedCount > 0 ? "text-health-warn" : "text-dimmer"}`} />
              <div className="text-2xl font-semibold font-mono ticker">{unassignedCount}</div>
            </div>
            <div className="text-xs text-dim mt-1">Open tickets with no assignee</div>
          </div>
        </div>
      </div>

      <EstimateEvolution projectId={projectId} />
    </div>
  );
}

function Ring({ title, actual, estimate, original }: { title: string; actual: number; estimate: number; original: number }) {
  const ratio = estimate > 0 ? Math.min(actual / estimate, 1.5) : 0;
  const pct = Math.min(ratio * 100, 100);
  const health = healthRatio(actual, estimate);
  const color =
    health === "good" ? "hsl(var(--health-good))" :
    health === "warn" ? "hsl(var(--health-warn))" :
    health === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

  const origRatio = original > 0 ? Math.min(actual / original, 1.5) : 0;
  const origPct = Math.min(origRatio * 100, 100);
  const origHealth = healthRatio(actual, original);
  const origColor =
    origHealth === "good" ? "hsl(var(--health-good))" :
    origHealth === "warn" ? "hsl(var(--health-warn))" :
    origHealth === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  const rInner = 38;
  const cInner = 2 * Math.PI * rInner;
  const dashInner = (origPct / 100) * cInner;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-dimmer mb-3">{title}</div>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth="10" fill="none" />
            <circle
              cx="70" cy="70" r={r}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              className="transition-all"
            />
            <circle cx="70" cy="70" r={rInner} stroke="hsl(0 0% 100% / 0.05)" strokeWidth="6" fill="none" />
            {original > 0 && (
              <circle
                cx="70" cy="70" r={rInner}
                stroke={origColor}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${dashInner} ${cInner}`}
                strokeLinecap="round"
                opacity={0.7}
                className="transition-all"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold font-mono leading-none">{Math.round(ratio * 100)}%</div>
            <div className="text-[10px] text-dimmer mt-0.5">burned</div>
            {original > 0 && (
              <div className="text-[10px] text-dimmer font-mono mt-0.5">vs orig {Math.round(origRatio * 100)}%</div>
            )}
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div>
            <div className="text-dimmer text-xs">Actual</div>
            <div className="font-mono">{formatHours(actual)}</div>
          </div>
          <div>
            <div className="text-dimmer text-xs">Estimate</div>
            <div className="font-mono">{formatHours(estimate)}</div>
          </div>
          <div>
            <div className="text-dimmer text-xs">Original</div>
            <div className="font-mono">{original > 0 ? formatHours(original) : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityPill({ state }: { state: string }) {
  if (state === "good") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-good/15 text-health-good ring-1 ring-health-good/30 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
      </div>
    );
  }
  if (state === "warn") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-warn/15 text-health-warn ring-1 ring-health-warn/30 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" /> At risk
      </div>
    );
  }
  if (state === "bad") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-bad/15 text-health-bad ring-1 ring-health-bad/30 text-xs font-medium">
        <AlertTriangle className="h-3.5 w-3.5" /> Over budget
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-dim ring-1 ring-white/10 text-xs font-medium">
      No data
    </div>
  );
}
