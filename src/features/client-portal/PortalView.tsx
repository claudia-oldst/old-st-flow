import { format } from "date-fns";
import { formatGBP, type PortalPayload, type PortalMonth } from "./types";
import { formatHours } from "@/lib/utils";

import { PortalEpicTable } from "./PortalEpicTable";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
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
  discounts = [],
}: {
  payload: PortalPayload;
  showRate: boolean;
  discounts?: EpicDiscount[];
}) {
  const { project, totals, epics, month } = payload;
  const totalDiscountedHours = discounts.reduce((s, d) => s + Number(d.hours), 0);
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
        discounts={discounts}
      />


      {project.summary_updated_at && (
        <div className="text-[10px] text-dimmer text-center pt-4">
          Last updated {format(new Date(project.summary_updated_at), "d MMMM yyyy")}
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">
        {label}
      </div>
      <div className="font-mono ticker text-3xl mt-1">{value}</div>
      {children}
    </div>
  );
}

/**
 * Month-to-date billing tile: hours logged inside the calendar month that the
 * portal cutoff falls in, split by discipline, less discounts raised that month.
 */
function MonthToDateTile({
  month,
  showRate,
}: {
  month: PortalMonth;
  showRate: boolean;
}) {
  const label = `${format(new Date(month.start), "MMMM yyyy")} to date`;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">
        {label}
      </div>
      <div className="font-mono ticker text-3xl mt-1">
        {showRate ? formatGBP(month.cost) : formatHours(month.billed_hours)}
      </div>
      <div className="mt-3 space-y-1">
        <MonthRow label="Frontend" hours={month.fe_actual} />
        <MonthRow label="Backend" hours={month.be_actual} />
        <MonthRow label="Project" hours={month.proj_actual} />
        {month.discount_hours > 0 && (
          <MonthRow
            label="Discounted"
            hours={-month.discount_hours}
            muted
          />
        )}
        {showRate && (
          <div className="flex items-center justify-between text-xs pt-1 hairline-t mt-1">
            <span className="text-dim">Billed</span>
            <span className="font-mono">{formatHours(month.billed_hours)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthRow({
  label,
  hours,
  muted,
}: {
  label: string;
  hours: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-dim">{label}</span>
      <span className={muted ? "font-mono text-dimmer" : "font-mono"}>
        {hours < 0 ? `−${formatHours(Math.abs(hours))}` : formatHours(hours)}
      </span>
    </div>
  );
}



function DisciplineRow({
  label,
  done,
  inProgress,
  todo,
}: {
  label: string;
  done: number;
  inProgress: number;
  todo: number;
}) {
  const total = done + inProgress + todo;
  const donePct = total > 0 ? (done / total) * 100 : 0;
  const ipPct = total > 0 ? (inProgress / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span>{label}</span>
        <span className="text-dim font-mono">
          {done} done · {inProgress} in progress · {todo} to do
        </span>
      </div>
      <SegmentedBar
        segments={[
          { pct: donePct, className: "bg-health-good" },
          { pct: ipPct, className: "bg-chart-in-progress" },
        ]}
      />
    </div>
  );
}
