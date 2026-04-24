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
import { CalendarIcon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { useProjectEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { cn, formatHours } from "@/lib/utils";

const NO_EPIC_KEY = "__no_epic__";
const ALL_EPICS_KEY = "__all__";

interface TimeLogLite {
  ticket_id: string;
  hours: number;
  discipline: "FE" | "BE" | "Overhead";
  logged_at: string;
}

export function EstimateEvolution({ projectId }: { projectId: string }) {
  const { tickets } = useProjectTickets(projectId);
  const { epics } = useProjectEpics(projectId);
  const { changes } = useProjectEstimateChanges(projectId);
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [selectedEpic, setSelectedEpic] = useState<string>(ALL_EPICS_KEY);
  const [logs, setLogs] = useState<TimeLogLite[]>([]);

  // Pull all FE/BE time logs for the project's tickets (ignore overhead).
  useEffect(() => {
    const ids = tickets.map((t) => t.id);
    if (ids.length === 0) {
      setLogs([]);
      return;
    }
    supabase
      .from("time_logs")
      .select("ticket_id,hours,discipline,logged_at")
      .in("ticket_id", ids)
      .in("discipline", ["FE", "BE"])
      .then(({ data }) => {
        setLogs(
          (data ?? []).map((l: any) => ({
            ticket_id: l.ticket_id,
            hours: Number(l.hours),
            discipline: l.discipline,
            logged_at: l.logged_at,
          }))
        );
      });
  }, [tickets]);

  // Build a ticket → epic_id map from tickets.
  const ticketEpic = useMemo(() => {
    const m = new Map<string, number | null>();
    tickets.forEach((t) => m.set(t.id, t.epic_id));
    return m;
  }, [tickets]);

  // Per-epic snapshot at the selected "as of" date.
  const epicSnapshots = useMemo(() => {
    const asOfMs = endOfDay(asOf).getTime();

    // Group tickets by epic key
    const groups = new Map<
      string,
      { name: string; original: number; current: number; actual: number; ticketIds: Set<string> }
    >();

    tickets.forEach((t) => {
      if (new Date(t.created_at).getTime() > asOfMs) return; // not yet created
      const key = t.epic_id != null ? `e:${t.epic_id}` : NO_EPIC_KEY;
      const name =
        t.epic_id != null
          ? epics.find((e) => e.id === t.epic_id)?.epic_name ?? `Epic ${t.epic_id}`
          : "No epic";
      if (!groups.has(key)) {
        groups.set(key, { name, original: 0, current: 0, actual: 0, ticketIds: new Set() });
      }
      const g = groups.get(key)!;
      g.original += t.original_fe_estimate + t.original_be_estimate;
      g.ticketIds.add(t.id);
    });

    // Apply approved changes up to asOf to derive current estimate
    changes.forEach((c) => {
      if (c.status !== "approved") return;
      if (new Date(c.created_at).getTime() > asOfMs) return;
      const epicId = ticketEpic.get(c.ticket_id);
      const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
      const g = groups.get(key);
      if (!g) return;
      g.current += c.delta;
    });

    // current = original + sum of deltas
    groups.forEach((g) => {
      g.current = g.original + g.current;
    });

    // Actuals to date
    logs.forEach((l) => {
      if (new Date(l.logged_at).getTime() > asOfMs) return;
      const epicId = ticketEpic.get(l.ticket_id);
      const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
      const g = groups.get(key);
      if (!g) return;
      g.actual += l.hours;
    });

    return Array.from(groups.entries())
      .map(([key, v]) => ({ key, ...v }))
      .filter((g) => g.original > 0 || g.current > 0 || g.actual > 0)
      .sort((a, b) => b.current - a.current);
  }, [tickets, epics, changes, logs, ticketEpic, asOf]);

  // Trend chart data — daily samples for the selected epic from earliest ticket to asOf.
  const trendData = useMemo(() => {
    if (tickets.length === 0) return [];

    const ticketFilter = (ticketId: string) => {
      if (selectedEpic === ALL_EPICS_KEY) return true;
      const epicId = ticketEpic.get(ticketId);
      if (selectedEpic === NO_EPIC_KEY) return epicId == null;
      return `e:${epicId}` === selectedEpic;
    };

    const relevantTickets = tickets.filter((t) => ticketFilter(t.id));
    if (relevantTickets.length === 0) return [];

    const first = new Date(
      Math.min(...relevantTickets.map((t) => new Date(t.created_at).getTime()))
    );
    const start = startOfDay(first).getTime();
    const end = endOfDay(asOf).getTime();
    if (end < start) return [];

    // Cap samples at ~120 buckets for performance
    const dayMs = 86_400_000;
    const totalDays = Math.max(1, Math.ceil((end - start) / dayMs));
    const stride = Math.max(1, Math.ceil(totalDays / 120));

    const buckets: Array<{ date: number; label: string; original: number; current: number; actual: number }> = [];

    for (let t = start; t <= end; t += stride * dayMs) {
      const cutoff = t;
      let original = 0;
      let deltas = 0;
      let actual = 0;

      relevantTickets.forEach((tk) => {
        if (new Date(tk.created_at).getTime() > cutoff) return;
        original += tk.original_fe_estimate + tk.original_be_estimate;
      });

      changes.forEach((c) => {
        if (c.status !== "approved") return;
        if (new Date(c.created_at).getTime() > cutoff) return;
        if (!ticketFilter(c.ticket_id)) return;
        deltas += c.delta;
      });

      logs.forEach((l) => {
        if (new Date(l.logged_at).getTime() > cutoff) return;
        if (!ticketFilter(l.ticket_id)) return;
        actual += l.hours;
      });

      buckets.push({
        date: t,
        label: format(new Date(t), "d MMM"),
        original,
        current: original + deltas,
        actual,
      });
    }

    return buckets;
  }, [tickets, changes, logs, ticketEpic, selectedEpic, asOf]);

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-dim" />
          <div className="text-xs uppercase tracking-wider text-dimmer">
            Estimate evolution by epic
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              As of {format(asOf, "d MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={asOf}
              onSelect={(d) => d && setAsOf(d)}
              disabled={(d) => d > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {epicSnapshots.length === 0 ? (
        <div className="text-sm text-dim py-6 text-center">
          No tickets exist on this date yet.
        </div>
      ) : (
        <div className="space-y-3">
          {epicSnapshots.map((g) => (
            <EpicRow key={g.key} {...g} />
          ))}
        </div>
      )}

      <div className="hairline-t pt-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[11px] uppercase tracking-wider text-dimmer">
            Trend over time
          </div>
          <Select value={selectedEpic} onValueChange={setSelectedEpic}>
            <SelectTrigger className="h-8 text-xs w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EPICS_KEY}>All epics aggregated</SelectItem>
              <SelectItem value={NO_EPIC_KEY}>No epic</SelectItem>
              {epics.map((e) => (
                <SelectItem key={e.id} value={`e:${e.id}`}>
                  {e.epic_name ?? `Epic ${e.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-64">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-dim">
              No data for this selection.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
                  name="Current estimate"
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
          )}
        </div>
      </div>
    </div>
  );
}

function EpicRow({
  name,
  original,
  current,
  actual,
}: {
  name: string;
  original: number;
  current: number;
  actual: number;
}) {
  const max = Math.max(original, current, actual, 1);
  const scopeDelta = current - original;
  const burnPct = current > 0 ? Math.round((actual / current) * 100) : 0;
  const burnColor =
    burnPct >= 100 ? "text-health-bad" : burnPct >= 80 ? "text-health-warn" : "text-health-good";
  return (
    <div className="rounded-xl bg-white/[0.02] hairline p-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="flex items-center gap-2 text-[10px]">
          {scopeDelta !== 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full ring-1",
                scopeDelta > 0
                  ? "bg-health-warn/15 text-health-warn ring-health-warn/30"
                  : "bg-health-good/15 text-health-good ring-health-good/30"
              )}
            >
              {scopeDelta > 0 ? "+" : ""}
              {formatHours(scopeDelta)} scope
            </span>
          )}
          <span className={cn("font-mono", burnColor)}>{burnPct}% burned</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <BarRow label="Original" value={original} max={max} color="hsl(0 0% 60%)" />
        <BarRow label="Current" value={current} max={max} color="hsl(217 91% 60%)" />
        <BarRow label="Actual" value={actual} max={max} color="hsl(38 92% 50%)" />
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 text-[10px] text-dimmer">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-16 text-right text-xs font-mono text-dim">
        {formatHours(value)}
      </div>
    </div>
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
