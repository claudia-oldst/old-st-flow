import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { formatHours, healthRatio } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import { TrendingUp, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

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
        acc.feEst += t.est_frontend_hours;
        acc.beEst += t.est_backend_hours;
        acc.feAct += t.actual_frontend_hours;
        acc.beAct += t.actual_backend_hours;
        acc.over += t.actual_overhead_hours;
        return acc;
      },
      { feEst: 0, beEst: 0, feAct: 0, beAct: 0, over: 0 }
    );
  }, [tickets]);

  const totalEst = totals.feEst + totals.beEst;
  const totalAct = totals.feAct + totals.beAct;
  const overall = healthRatio(totalAct, totalEst);
  const profitabilityPct = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0;

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

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Ring title="Frontend" actual={totals.feAct} estimate={totals.feEst} />
        <Ring title="Backend" actual={totals.beAct} estimate={totals.beEst} />
        <div className="glass rounded-2xl p-5 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Profitability</div>
          <div className="flex items-center gap-3">
            <ProfitabilityPill state={overall} />
            <div>
              <div className="text-2xl font-semibold font-mono ticker">{profitabilityPct}%</div>
              <div className="text-xs text-dim">of estimate burned</div>
            </div>
          </div>
          <div className="mt-auto pt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-dimmer">Total est.</div>
              <div className="font-mono">{formatHours(totalEst)}</div>
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
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-wider text-dimmer">Member capacity</div>
            <div className="text-xs text-dim">Open tickets · hours this week</div>
          </div>
          {members.length === 0 ? (
            <div className="text-sm text-dim">No members yet.</div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition">
                  <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="sm" />
                  <div className="flex-1">
                    <div className="text-sm">{m.member.name}</div>
                    <div className="text-[10px] text-dimmer">{m.role}</div>
                  </div>
                  <div className="text-xs font-mono text-dim">
                    <span className="text-foreground">{ticketsByMember[m.user_id] ?? 0}</span> tix
                  </div>
                  <div className="text-xs font-mono text-dim w-16 text-right">
                    {formatHours(weekHours[m.user_id] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
}

function Ring({ title, actual, estimate }: { title: string; actual: number; estimate: number }) {
  const ratio = estimate > 0 ? Math.min(actual / estimate, 1.5) : 0;
  const pct = Math.min(ratio * 100, 100);
  const health = healthRatio(actual, estimate);
  const color =
    health === "good" ? "hsl(var(--health-good))" :
    health === "warn" ? "hsl(var(--health-warn))" :
    health === "bad" ? "hsl(var(--health-bad))" :
    "hsl(0 0% 30%)";

  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

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
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold font-mono">{Math.round(ratio * 100)}%</div>
            <div className="text-[10px] text-dimmer">burned</div>
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
