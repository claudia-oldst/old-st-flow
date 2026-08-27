import { format } from "date-fns";
import { formatHours } from "@/lib/utils";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";
import { formatGBP, type PortalPayload } from "../types";
import { ReportSection } from "./EditableText";
import { TotalRow } from "./tiles";
import type { ReportChangeRequest } from "./useReportData";

type PortalEpic = PortalPayload["epics"][number];

export function ReportDiscounts({
  discounts,
  epics,
}: {
  discounts: EpicDiscount[];
  epics: PortalEpic[];
}) {
  if (discounts.length === 0) return null;
  return (
    <ReportSection title="Credits applied">
      <div className="glass rounded-2xl overflow-hidden">
        {discounts.map((d) => {
          const epic = epics.find((e) => e.id === d.epic_id);
          return (
            <div
              key={d.id}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_80px_90px] gap-3 px-4 py-2.5 hairline-b last:border-b-0 text-xs items-center"
            >
              <div>{epic?.epic_name ?? "Project"}</div>
              <div className="text-dim">{d.reason}</div>
              <div className="font-mono text-right">−{formatHours(Number(d.hours))}</div>
              <div className="font-mono text-right text-dimmer">
                {format(new Date(d.applied_at), "d MMM yyyy")}
              </div>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}

export function ReportChangeRequests({ crs }: { crs: ReportChangeRequest[] }) {
  if (crs.length === 0) return null;
  return (
    <ReportSection title="Change requests">
      <div className="glass rounded-2xl overflow-hidden">
        {crs.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[90px_minmax(0,2.4fr)_70px_90px] gap-3 px-4 py-2.5 hairline-b last:border-b-0 text-xs items-center"
          >
            <div className="font-mono text-dimmer">{c.formatted_id}</div>
            <div>{c.title}</div>
            <div className="font-mono text-right">+{formatHours(c.hours)}</div>
            <div className="text-right capitalize text-dim">{c.status}</div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function ReportTotals({
  totals,
  discountHours,
  effectiveActual,
  ratePerHour,
}: {
  totals: PortalPayload["totals"];
  discountHours: number;
  effectiveActual: number;
  ratePerHour: number;
}) {
  return (
    <ReportSection title="Totals">
      <div className="glass rounded-2xl overflow-hidden">
        <TotalRow label="Actual hours" value={formatHours(totals.actual_total)} />
        <TotalRow label="Current estimate" value={formatHours(totals.current_total)} />
        <TotalRow label="Original estimate" value={formatHours(totals.original_total)} />
        {discountHours > 0 && (
          <TotalRow label="Credits applied" value={`−${formatHours(discountHours)}`} />
        )}
        <TotalRow label="Billable hours" value={formatHours(effectiveActual)} />
        {ratePerHour > 0 && (
          <>
            <TotalRow label="Rate" value={`${formatGBP(ratePerHour)} per hour`} />
            <TotalRow
              label="Total cost to date"
              value={formatGBP(effectiveActual * ratePerHour)}
            />
          </>
        )}
      </div>
    </ReportSection>
  );
}
