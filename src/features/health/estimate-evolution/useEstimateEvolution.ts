import { useMemo } from "react";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { useTrendData } from "@/features/_shared/estimate-trend/useTrendData";
import { buildTrendSeries } from "@/features/_shared/estimate-trend/buildTrendSeries";
import { ALL_EPICS_KEY, NO_EPIC_KEY } from "./dateUtils";
import { buildEpicSnapshots } from "./buildEpicSnapshots";
import { versionKeyOf } from "../versionFilter";

export function useEstimateEvolution({
  projectId,
  asOf,
  selectedEpic,
  epics,
  versionKeys = null,
  includeDiscounts = true,
}: {
  projectId: string;
  asOf: Date;
  selectedEpic: string;
  epics: { id: number; epic_name: string | null }[];
  /** null = all versions. Otherwise the allowed version keys. */
  versionKeys?: string[] | null;
  includeDiscounts?: boolean;
}) {
  const { dataset } = useTrendData(projectId);
  const { tickets, changes, logs, projectStart, ticketEpic } = dataset;
  const { discounts: allDiscounts } = useEpicDiscounts(projectId);
  const discounts = useMemo(
    () => (includeDiscounts ? allDiscounts : []),
    [includeDiscounts, allDiscounts],
  );

  const versionSet = useMemo(
    () => (versionKeys ? new Set(versionKeys) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [versionKeys ? versionKeys.join("|") : null],
  );

  const allowedTicket = useMemo(() => {
    if (!versionSet) return null;
    const ids = new Set<string>();
    tickets.forEach((t) => {
      if (versionSet.has(versionKeyOf(t.version))) ids.add(t.id);
    });
    return ids;
  }, [versionSet, tickets]);

  const scopedTickets = useMemo(
    () => (allowedTicket ? tickets.filter((t) => allowedTicket.has(t.id)) : tickets),
    [tickets, allowedTicket],
  );
  const scopedChanges = useMemo(
    () => (allowedTicket ? changes.filter((c) => allowedTicket.has(c.ticket_id)) : changes),
    [changes, allowedTicket],
  );
  const scopedLogs = useMemo(
    () => (allowedTicket ? logs.filter((l) => allowedTicket.has(l.ticket_id)) : logs),
    [logs, allowedTicket],
  );

  const epicSnapshots = useMemo(
    () =>
      buildEpicSnapshots({
        tickets: scopedTickets,
        changes: scopedChanges,
        logs: scopedLogs,
        discounts,
        epics,
        ticketEpic,
        asOf,
      }),
    [scopedTickets, scopedChanges, scopedLogs, discounts, epics, ticketEpic, asOf],
  );

  const trendData = useMemo(() => {
    const ticketFilter = (ticketId: string) => {
      if (allowedTicket && !allowedTicket.has(ticketId)) return false;
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
  }, [tickets, changes, logs, discounts, ticketEpic, selectedEpic, projectStart, asOf, allowedTicket]);

  return { epicSnapshots, trendData };
}
