import { format } from "date-fns";
import { formatGBP, type PortalPayload } from "./types";

import { PortalEpicTable } from "./PortalEpicTable";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import { Tile, MonthToDateTile, DisciplineRow } from "./PortalTiles";
import {
  type EpicDiscount,
} from "@/features/discounts/applyDiscounts";




/**
 * Visual render of the client-facing portal payload.
 * Shared between the PMBA editor preview and the public /h/:hash route.
 * Discounts are applied at display time only — raw totals/actuals are unchanged.
 */
export function PortalView({
  payload,
  showRate,
  discounts,
}: {
  payload: PortalPayload;
  showRate: boolean;
  /** Optional override; by default the server-scoped payload discounts are used. */
  discounts?: EpicDiscount[];
}) {
  const { project, totals, epics, month } = payload;
  const effectiveDiscounts: EpicDiscount[] =
    discounts ??
    (payload.discounts ?? []).map((d) => ({
      ...d,
      project_id: project.id,
      created_by: null,
      created_at: d.applied_at,
      updated_at: d.applied_at,
    }));
  const totalDiscountedHours = effectiveDiscounts.reduce(
    (s, d) => s + Number(d.hours),
    0,
  );
  const effectiveActualHours = Math.max(0, totals.actual_total - totalDiscountedHours);

  const effectiveCostActual = effectiveActualHours * project.rate_per_hour;
  const devDone = totals.tickets_dev_done ?? 0;
  const completionPct =
    totals.tickets_total > 0
      ? Math.round(((totals.tickets_done + devDone) / totals.tickets_total) * 100)
      : 0;
  const donePct =
    totals.tickets_total > 0
      ? (totals.tickets_done / totals.tickets_total) * 100
      : 0;
  const devDonePct =
    totals.tickets_total > 0 ? (devDone / totals.tickets_total) * 100 : 0;



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.client_name && (
            <div className="text-sm text-dim mt-1">{project.client_name}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-dimmer">As of</div>
          <div className="font-mono text-sm">
            {format(new Date(project.cutoff), "d MMMM yyyy")}
          </div>
        </div>
      </div>

      {/* Intro */}
      {project.summary && (
        <div className="glass rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap">
          {project.summary}
        </div>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Tickets" value={String(totals.tickets_total)}>
          <div className="text-xs text-dim mt-1">
            {[
              `${totals.tickets_done} done`,
              devDone > 0 ? `${devDone} dev done` : null,
              totals.tickets_in_progress > 0
                ? `${totals.tickets_in_progress} active`
                : null,
              totals.tickets_backlog > 0
                ? `${totals.tickets_backlog} backlog`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </Tile>
        <Tile label="Progress" value={`${completionPct}%`}>
          <div className="mt-2">
            <SegmentedBar
              segments={[
                { pct: donePct, className: "bg-health-good" },
                { pct: devDonePct, className: "bg-health-good/50" },
              ]}
            />
          </div>
        </Tile>

        {showRate && project.rate_per_hour > 0 && (
          <Tile label="Cost" value={formatGBP(effectiveCostActual)}>
            <div className="text-xs text-dim mt-1">
              of {formatGBP(totals.cost_estimate)}
            </div>
          </Tile>
        )}

        {month && (
          <MonthToDateTile
            month={month}
            showRate={showRate && project.rate_per_hour > 0}
          />
        )}
      </div>


      {/* Discipline breakdown */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="text-xs uppercase tracking-wider text-dimmer">
          Frontend & Backend
        </div>
        <DisciplineRow
          label="Frontend"
          done={totals.fe_done}
          inProgress={totals.fe_in_progress}
          todo={totals.fe_todo}
        />
        <DisciplineRow
          label="Backend"
          done={totals.be_done}
          inProgress={totals.be_in_progress}
          todo={totals.be_todo}
        />
      </div>

      {/* Unified epic table with trend chart + per-epic progress/change details. */}
      <PortalEpicTable
        epics={epics}
        projectId={project.id}
        versions={project.versions ?? null}
        cutoff={project.cutoff}
        ratePerHour={project.rate_per_hour}
        showRate={showRate}
        discounts={effectiveDiscounts}
      />


      {project.summary_updated_at && (
        <div className="text-[10px] text-dimmer text-center pt-4">
          Last updated {format(new Date(project.summary_updated_at), "d MMMM yyyy")}
        </div>
      )}
    </div>
  );
}
