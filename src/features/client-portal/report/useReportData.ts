import { useMemo } from "react";
import { buildTrendSeries } from "@/features/_shared/estimate-trend/buildTrendSeries";
import { useTrendData } from "@/features/_shared/estimate-trend/useTrendData";
import { versionKeyOf } from "@/features/health/versionFilter";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";
import type { PortalPayload } from "../types";

export interface ReportChangeRequest {
  id: string;
  formatted_id: string;
  title: string;
  hours: number;
  status: "pending" | "approved";
  decided_at: string | null;
}

/**
 * Derives everything the printed client report renders: discounts, headline
 * percentages, the version-scoped estimate trend and client-visible CRs.
 */
export function useReportData(payload: PortalPayload) {
  const { project, totals, epics } = payload;

  const discounts: EpicDiscount[] = useMemo(
    () =>
      (payload.discounts ?? []).map((d) => ({
        ...d,
        project_id: project.id,
        created_by: null,
        created_at: d.applied_at,
        updated_at: d.applied_at,
      })),
    [payload.discounts, project.id],
  );

  const discountHours = discounts.reduce((s, d) => s + Number(d.hours), 0);
  const effectiveActual = Math.max(0, totals.actual_total - discountHours);
  const devDone = totals.tickets_dev_done ?? 0;
  const completionPct =
    totals.tickets_total > 0
      ? Math.round(((totals.tickets_done + devDone) / totals.tickets_total) * 100)
      : 0;
  const donePct =
    totals.tickets_total > 0 ? (totals.tickets_done / totals.tickets_total) * 100 : 0;
  const devDonePct = totals.tickets_total > 0 ? (devDone / totals.tickets_total) * 100 : 0;

  const visibleEpics = useMemo(() => epics.filter((e) => e.total_tickets > 0), [epics]);

  // ---- Estimate trend over time (aggregate, scoped to portal versions) ----
  const { dataset } = useTrendData(project.id);
  const { tickets, changes, logs, projectStart, ticketEpic, ticketVersion } = dataset;
  const cutoffMs = useMemo(() => new Date(project.cutoff).getTime(), [project.cutoff]);
  const versionSet = useMemo(
    () => (project.versions && project.versions.length ? new Set(project.versions) : null),
    [project.versions],
  );
  const includedIds = useMemo(() => new Set(visibleEpics.map((e) => e.id)), [visibleEpics]);
  const trend = useMemo(
    () =>
      buildTrendSeries({
        tickets,
        changes,
        logs,
        projectStart: projectStart ? new Date(projectStart) : null,
        cutoffMs,
        ticketFilter: (tid) => {
          const eid = ticketEpic.get(tid);
          if (eid == null || !includedIds.has(eid)) return false;
          return !versionSet || versionSet.has(versionKeyOf(ticketVersion.get(tid)));
        },
        discounts,
      }),
    [
      tickets,
      changes,
      logs,
      projectStart,
      cutoffMs,
      ticketEpic,
      ticketVersion,
      includedIds,
      versionSet,
      discounts,
    ],
  );

  // ---- Change requests visible to the client ----
  const { tickets: projectTickets } = useProjectTickets(project.id);
  const crs: ReportChangeRequest[] = useMemo(
    () =>
      projectTickets
        .filter(
          (t) =>
            t.ticket_type === "CR" &&
            (t.cr_approval === "pending" || t.cr_approval === "approved"),
        )
        .map((t) => ({
          id: t.id,
          formatted_id: t.formatted_id,
          title: t.title,
          hours:
            Number(t.current_fe_estimate || 0) +
            Number(t.current_be_estimate || 0) +
            Number(t.current_project_estimate || 0),
          status: t.cr_approval as "pending" | "approved",
          decided_at: t.cr_decided_at as string | null,
        })),
    [projectTickets],
  );

  const versionLabel =
    project.versions && project.versions.length ? project.versions.join(", ") : "All versions";

  return {
    discounts,
    discountHours,
    effectiveActual,
    devDone,
    completionPct,
    donePct,
    devDonePct,
    visibleEpics,
    trend,
    crs,
    versionLabel,
  };
}
