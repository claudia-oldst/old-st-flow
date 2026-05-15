import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEK_TARGET = 40;

function weekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = (day + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMon);
  const fridayEnd = new Date(monday);
  fridayEnd.setDate(monday.getDate() + 5); // exclusive: through end of Fri
  return { start: monday.toISOString(), end: fridayEnd.toISOString(), key: monday.toDateString() };
}

export function WeeklyHoursBar() {
  const user = useCurrentUser((s) => s.user);
  const { start, end, key } = weekRange();

  const { data: hours = 0, refetch } = useQuery({
    queryKey: ["weekly-hours", user?.id, key],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_logs")
        .select("hours")
        .eq("user_id", user!.id)
        .gte("logged_at", start)
        .lt("logged_at", end);
      if (error) throw error;
      return ((data as any[]) ?? []).reduce((a, r) => a + (Number(r.hours) || 0), 0);
    },
  });

  const reload = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeReload(
    user ? [{ table: "time_logs", filter: `user_id=eq.${user.id}` }] : null,
    reload,
    !!user,
  );

  const pct = Math.min(100, (hours / WEEK_TARGET) * 100);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="sticky top-14 z-30 h-0.5 w-full bg-white/5 cursor-default">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="font-mono text-xs">
            {hours.toFixed(1)}h / {WEEK_TARGET}h this week
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
