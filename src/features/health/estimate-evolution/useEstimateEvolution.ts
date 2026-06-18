import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { startOfDay } from "./dateUtils";
import type { TimeLogLite } from "./ticketEffectiveMs";
import { buildEpicSnapshots } from "./buildEpicSnapshots";
import { buildTrendData } from "./buildTrendData";

export function useEstimateEvolution({
  projectId,
  asOf,
  selectedEpic,
  epics,
}: {
  projectId: string;
  asOf: Date;
  selectedEpic: string;
  epics: { id: number; epic_name: string | null }[];
}) {
  const { tickets } = useProjectTickets(projectId);
  const { changes } = useProjectEstimateChanges(projectId);
  const { discounts } = useEpicDiscounts(projectId);

  const projectStartKey = ["projectStart", projectId] as const;
  const projectStartQuery = useQuery({
    queryKey: projectStartKey,
    enabled: !!projectId,
    queryFn: async (): Promise<Date | null> => {
      const { data } = await supabase
        .from("projects")
        .select("start_date")
        .eq("id", projectId)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sd = (data as any)?.start_date as string | null | undefined;
      return sd ? startOfDay(new Date(sd)) : null;
    },
  });
  const projectStart = projectStartQuery.data ?? null;

  useRealtimeInvalidate(
    [{ table: "projects", filter: `id=eq.${projectId}` }],
    projectStartKey,
  );

  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  const ticketIdsKey = ticketIds.join(",");
  const logsQuery = useQuery({
    queryKey: ["evolutionLogs", projectId, ticketIdsKey] as const,
    enabled: ticketIds.length > 0,
    queryFn: async (): Promise<TimeLogLite[]> => {
      const { data } = await supabase
        .from("time_logs")
        .select("ticket_id,hours,discipline,logged_at")
        .in("ticket_id", ticketIds)
        .in("discipline", ["FE", "BE"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((l: any) => ({
        ticket_id: l.ticket_id,
        hours: Number(l.hours),
        discipline: l.discipline,
        logged_at: l.logged_at,
      }));
    },
  });
  const logs = logsQuery.data ?? [];

  useRealtimeInvalidate([{ table: "time_logs" }], ["evolutionLogs", projectId]);

  const ticketEpic = useMemo(() => {
    const m = new Map<string, number | null>();
    tickets.forEach((t) => m.set(t.id, t.epic_id));
    return m;
  }, [tickets]);

  const epicSnapshots = useMemo(
    () =>
      buildEpicSnapshots({
        tickets,
        changes,
        logs,
        discounts,
        epics,
        ticketEpic,
        asOf,
      }),
    [tickets, changes, logs, discounts, epics, ticketEpic, asOf],
  );

  const trendData = useMemo(
    () =>
      buildTrendData({
        tickets,
        changes,
        logs,
        discounts,
        ticketEpic,
        selectedEpic,
        asOf,
        projectStart,
      }),
    [tickets, changes, logs, discounts, ticketEpic, selectedEpic, asOf, projectStart],
  );

  return { epicSnapshots, trendData };
}
