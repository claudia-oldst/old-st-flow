import { useMemo } from "react";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { useTrendData } from "@/features/_shared/estimate-trend/useTrendData";
import { buildTrendSeries } from "@/features/_shared/estimate-trend/buildTrendSeries";
import { ALL_EPICS_KEY, NO_EPIC_KEY } from "./dateUtils";
import { buildEpicSnapshots } from "./buildEpicSnapshots";

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
  const { dataset } = useTrendData(projectId);
  const { tickets, changes, logs, projectStart, ticketEpic } = dataset;
  const { discounts } = useEpicDiscounts(projectId);

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

  const trendData = useMemo(() => {
    const ticketFilter = (ticketId: string) => {
      if (selectedEpic === ALL_EPICS_KEY) return true;
      const epicId = ticketEpic.get(ticketId);
      if (selectedEpic === NO_EPIC_KEY) return epicId == null;
      return `e:${epicId}` === selectedEpic;
    };
    const discountFilter = (epicId: number) => {
      if (selectedEpic === ALL_EPICS_KEY) return true;
      if (selectedEpic === NO_EPIC_KEY) return false;
      return `e:${epicId}` === selectedEpic;
    };
    const relevantDiscounts = discounts.filter((d) => discountFilter(d.epic_id));
    return buildTrendSeries({
      tickets,
      changes,
      logs,
      discounts: relevantDiscounts,
      projectStart: projectStart ? new Date(projectStart) : null,
      cutoffMs: asOf.getTime(),
      ticketFilter,
    });
  }, [tickets, changes, logs, discounts, ticketEpic, selectedEpic, projectStart, asOf]);

  return { epicSnapshots, trendData };
}
