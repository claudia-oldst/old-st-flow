import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfISOWeek, addWeeks, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { formatHours, cn } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

interface Props {
  projectId: string;
  tickets: TicketRow[];
}

export function WeeklyBurnPanel({ projectId, tickets }: Props) {
  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  const queryKey = ["weeklyBurn", projectId] as const;

  const { data: logs = [] } = useQuery({
    queryKey,
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      // Only fetch ~12 weeks of logs to keep the payload small.
      const since = startOfISOWeek(addWeeks(new Date(), -10)).toISOString();
      const { data } = await supabase
        .from("time_logs")
        .select("logged_at, hours")
        .in("ticket_id", ticketIds)
        .gte("logged_at", since);
      return (data ?? []) as { logged_at: string; hours: number }[];
    },
  });

  useRealtimeInvalidate([{ table: "time_logs" }], queryKey);

  const { weeks, maxHours, currentWeekHours, trend } = useMemo(() => {
    const thisWeek = startOfISOWeek(new Date());
    // 9 bars: 8 prior complete weeks + current partial week.
    const buckets: { start: Date; hours: number }[] = [];
    for (let i = -8; i <= 0; i++) {
      buckets.push({ start: addWeeks(thisWeek, i), hours: 0 });
    }
    for (const log of logs) {
      const wk = startOfISOWeek(new Date(log.logged_at)).getTime();
      const slot = buckets.find((b) => b.start.getTime() === wk);
      if (slot) slot.hours += Number(log.hours) || 0;
    }
    const maxH = Math.max(0, ...buckets.map((b) => b.hours));
    const current = buckets[buckets.length - 1].hours;
    const prior = buckets[buckets.length - 2].hours;
    const trendPct =
      prior > 0
        ? Math.round(((current - prior) / prior) * 100)
        : current > 0
        ? 100
        : 0;
    return { weeks: buckets, maxHours: maxH, currentWeekHours: current, trend: trendPct };
  }, [logs]);

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-xs uppercase tracking-wider text-dimmer">Weekly burn rate</div>
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
            trend >= 0
              ? "bg-health-good/10 text-health-good"
              : "bg-health-warn/10 text-health-warn",
          )}
          title="Change vs prior week"
        >
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      </div>

      <div className="flex items-end gap-1 h-20 flex-1">
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1;
          const heightPct = maxHours > 0 ? Math.max(4, (w.hours / maxHours) * 100) : 4;
          return (
            <div
              key={w.start.toISOString()}
              className="flex-1 flex items-end h-full"
              title={`${format(w.start, "MMM d")}: ${formatHours(w.hours)}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  isCurrent ? "bg-primary" : "bg-primary/40",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-dimmer">
        <span>8 wks ago</span>
        <span className="font-mono text-dim">
          {formatHours(currentWeekHours)} this week
        </span>
      </div>
    </div>
  );
}
