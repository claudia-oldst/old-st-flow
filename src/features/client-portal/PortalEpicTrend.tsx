import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { ChevronDown, TrendingUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import { cn, formatHours } from "@/lib/utils";

interface TicketLite {
  id: string;
  created_at: string;
  epic_id: number | null;
  original_fe_estimate: number;
  original_be_estimate: number;
}
interface ChangeLite {
  ticket_id: string;
  delta: number;
  created_at: string;
}
interface LogLite {
  ticket_id: string;
  hours: number;
  logged_at: string;
}

export function PortalEpicTrend({
  projectId,
  cutoff,
  includedEpics,
}: {
  projectId: string;
  cutoff: string;
  includedEpics: Array<{ id: number; name: string }>;
}) {
  const [tickets, setTickets] = useState<TicketLite[]>([]);
  const [changes, setChanges] = useState<ChangeLite[]>([]);
  const [logs, setLogs] = useState<LogLite[]>([]);
  const [projectStart, setProjectStart] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const includedIds = useMemo(() => new Set(includedEpics.map((e) => e.id)), [includedEpics]);

  useRealtimeReload(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_estimate_changes" },
          { table: "time_logs" },
        ]
      : null,
    useMemo(() => () => setTick((t) => t + 1), []),
    !!projectId,
  );

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const [{ data: proj }, { data: tk }] = await Promise.all([
        supabase.from("projects").select("start_date").eq("id", projectId).maybeSingle(),
        supabase
          .from("tickets")
          .select("id,created_at,epic_id,original_fe_estimate,original_be_estimate")
          .eq("project_id", projectId),
      ]);
      if (cancelled) return;
      setProjectStart((proj as any)?.start_date ?? null);
      const tkRows = (tk ?? []) as any[];
      const filtered: TicketLite[] = tkRows
        .filter((t) => t.epic_id != null && includedIds.has(t.epic_id))
        .map((t) => ({
          id: t.id,
          created_at: t.created_at,
          epic_id: t.epic_id,
          original_fe_estimate: Number(t.original_fe_estimate) || 0,
          original_be_estimate: Number(t.original_be_estimate) || 0,
        }));
      setTickets(filtered);

      const ids = filtered.map((t) => t.id);
      if (ids.length === 0) {
        setChanges([]);
        setLogs([]);
        return;
      }
      // Chunk .in() to avoid URL length limits with large ticket sets.
      const CHUNK = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

      const chResults = await Promise.all(
        chunks.map((c) =>
          supabase
            .from("ticket_estimate_changes")
            .select("ticket_id,delta,created_at,status")
            .in("ticket_id", c)
            .eq("status", "approved"),
        ),
      );
      const lgResults = await Promise.all(
        chunks.map((c) =>
          supabase
            .from("time_logs")
            .select("ticket_id,hours,logged_at,discipline")
            .in("ticket_id", c)
            .in("discipline", ["FE", "BE"]),
        ),
      );
      if (cancelled) return;
      const chRows = chResults.flatMap((r) => (r.data ?? []) as any[]);
      const lgRows = lgResults.flatMap((r) => (r.data ?? []) as any[]);
      setChanges(
        chRows.map((c) => ({
          ticket_id: c.ticket_id,
          delta: Number(c.delta) || 0,
          created_at: c.created_at,
        })),
      );
      setLogs(
        lgRows.map((l) => ({
          ticket_id: l.ticket_id,
          hours: Number(l.hours) || 0,
          logged_at: l.logged_at,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, includedIds, tick]);

  const ticketEpic = useMemo(() => {
    const m = new Map<string, number>();
    tickets.forEach((t) => t.epic_id != null && m.set(t.id, t.epic_id));
    return m;
  }, [tickets]);

  const cutoffMs = new Date(cutoff).getTime();

  const buildSeries = (ticketFilter: (id: string) => boolean) => {
    const relevant = tickets.filter((t) => ticketFilter(t.id));
    if (relevant.length === 0) return [];
    const firstMs = Math.min(...relevant.map((t) => new Date(t.created_at).getTime()));
    const startMs = projectStart
      ? startOfDay(new Date(projectStart)).getTime()
      : startOfDay(new Date(firstMs)).getTime();
    const end = endOfDay(new Date(cutoffMs)).getTime();
    if (end < startMs) return [];
    const dayMs = 86_400_000;
    const totalDays = Math.max(1, Math.ceil((end - startMs) / dayMs));
    const stride = Math.max(1, Math.ceil(totalDays / 80));
    const buckets: Array<{ label: string; original: number; current: number; actual: number }> = [];
    for (let t = startMs; t <= end; t += stride * dayMs) {
      const c = t;
      let original = 0;
      let deltas = 0;
      let actual = 0;
      relevant.forEach((tk) => {
        if (new Date(tk.created_at).getTime() > c) return;
        original += tk.original_fe_estimate + tk.original_be_estimate;
      });
      changes.forEach((ch) => {
        if (!ticketFilter(ch.ticket_id)) return;
        if (new Date(ch.created_at).getTime() > c) return;
        deltas += ch.delta;
      });
      logs.forEach((l) => {
        if (!ticketFilter(l.ticket_id)) return;
        if (new Date(l.logged_at).getTime() > c) return;
        actual += l.hours;
      });
      buckets.push({
        label: format(new Date(t), "d MMM"),
        original,
        current: original + deltas,
        actual,
      });
    }
    return buckets;
  };

  const aggregated = useMemo(() => buildSeries(() => true), [tickets, changes, logs, projectStart, cutoffMs]);

  if (includedEpics.length === 0 || tickets.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-dim" />
        <div className="text-xs uppercase tracking-wider text-dimmer">
          Estimate trend over time
        </div>
      </div>
      <div className="h-56">
        {aggregated.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-dim">
            No trend data yet.
          </div>
        ) : (
          <TrendChart data={aggregated} />
        )}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02] hairline hover:bg-white/[0.04] transition-colors">
          <span className="text-xs uppercase tracking-wider text-dimmer">
            {open ? "Hide" : "Show"} per-epic detail ({includedEpics.length})
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-dim transition-transform", open && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <div className="space-y-3 pt-3">
            {includedEpics.map((e) => {
              const series = buildSeries((tid) => ticketEpic.get(tid) === e.id);
              return (
                <div key={e.id} className="rounded-xl bg-white/[0.02] hairline p-3">
                  <div className="text-sm font-medium mb-2">{e.name}</div>
                  <div className="h-40">
                    {series.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-dim">
                        No data
                      </div>
                    ) : (
                      <TrendChart data={series} compact />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function TrendChart({
  data,
  compact,
}: {
  data: Array<{ label: string; original: number; current: number; actual: number }>;
  compact?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(0 0% 100% / 0.4)"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="hsl(0 0% 100% / 0.4)"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(0 0% 8%)",
            border: "1px solid hsl(0 0% 100% / 0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: any) => `${formatHours(Number(v))}`}
        />
        {!compact && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Line
          type="monotone"
          dataKey="original"
          name="Original"
          stroke="hsl(0 0% 60%)"
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="current"
          name="Current"
          stroke="hsl(217 91% 60%)"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="hsl(38 92% 50%)"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
