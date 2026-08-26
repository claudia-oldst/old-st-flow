import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfISOWeek, addWeeks, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { formatHours, cn } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  projectId: string;
  tickets: TicketRow[];
}

interface MemberBurn {
  name: string;
  color: string;
  hours: number;
}

interface BurnWeek {
  start: Date;
  hours: number;
  members: MemberBurn[];
}

export function WeeklyBurnPanel({ projectId, tickets }: Props) {
  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  // Ticket set can be narrowed by the Health page's version filter, so it is
  // part of the cache key.
  const ticketKey = useMemo(() => [...ticketIds].sort().join(","), [ticketIds]);
  const queryKey = ["weeklyBurn", projectId, ticketKey] as const;

  const { data: logs = [] } = useQuery({
    queryKey,
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      // Fetch range matches rendered range exactly (8 prior weeks + current).
      const since = startOfISOWeek(addWeeks(new Date(), -8)).toISOString();
      const { data } = await supabase
        .from("time_logs")
        .select("logged_at, hours, user_id, member:team_members(name, avatar_color)")
        .in("ticket_id", ticketIds)
        .gte("logged_at", since);
      return (data ?? []) as {
        logged_at: string;
        hours: number;
        user_id: string;
        member: { name: string; avatar_color: string } | null;
      }[];
    },
  });

  useRealtimeInvalidate([{ table: "time_logs" }], queryKey);

  const { weeks, maxHours, currentWeekHours, trend } = useMemo(() => {
    const thisWeek = startOfISOWeek(new Date());
    // 9 bars: 8 prior complete weeks + current partial week.
    const buckets: BurnWeek[] = [];
    for (let i = -8; i <= 0; i++) {
      buckets.push({ start: addWeeks(thisWeek, i), hours: 0, members: [] });
    }
    for (const log of logs) {
      const wk = startOfISOWeek(new Date(log.logged_at)).getTime();
      const slot = buckets.find((b) => b.start.getTime() === wk);
      if (!slot) continue;
      slot.hours += Number(log.hours) || 0;
      if (log.member) {
        const existing = slot.members.find((m) => m.name === log.member!.name);
        if (existing) {
          existing.hours += Number(log.hours) || 0;
        } else {
          slot.members.push({
            name: log.member.name,
            color: log.member.avatar_color,
            hours: Number(log.hours) || 0,
          });
        }
      }
    }
    for (const bucket of buckets) {
      bucket.members.sort((a, b) => b.hours - a.hours);
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
    <TooltipProvider delayDuration={150}>
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
              <Tooltip key={w.start.toISOString()}>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex items-end h-full cursor-default">
                    <div
                      className={cn(
                        "w-full rounded-sm transition-all",
                        isCurrent ? "bg-primary" : "bg-primary/40",
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-popover-foreground">
                      {format(w.start, "MMM d")} · {formatHours(w.hours)}
                    </div>
                    {w.members.length > 0 ? (
                      <div className="space-y-0.5">
                        {w.members.map((m) => (
                          <div key={m.name} className="flex items-center gap-2 text-xs">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: m.color }}
                            />
                            <span className="flex-1 text-dim truncate">{m.name}</span>
                            <span className="font-mono text-popover-foreground">
                              {formatHours(m.hours)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-dim">0h logged</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
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
    </TooltipProvider>
  );
}
