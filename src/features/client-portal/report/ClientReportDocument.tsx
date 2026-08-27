import { format } from "date-fns";
import { formatGBP, type PortalPayload } from "../types";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import { TrendChart } from "@/features/_shared/estimate-trend/TrendChart";
import { SprintGanttOrEmpty } from "@/features/sprints/SprintGanttOrEmpty";
import { EditableText, ReportSection } from "./EditableText";
import { DisciplineRow, MonthTile, Tile } from "./tiles";
import { ReportEpics } from "./ReportEpics";
import { ReportChangeRequests, ReportDiscounts, ReportTotals } from "./ReportLedgers";
import { useReportData } from "./useReportData";
import logo from "@/assets/oldst-logo.png";

/**
 * Portal-styled, print-ready client report. Rendered on its own route so the
 * page prints as a clean A4 document; all narrative blocks are editable in
 * place before printing.
 */
export function ClientReportDocument({
  payload,
  publicUrl,
}: {
  payload: PortalPayload;
  publicUrl: string | null;
}) {
  const { project, totals, epics, month } = payload;
  const {
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
  } = useReportData(payload);

  return (
    <div className="report-doc space-y-8 text-foreground">
      {/* Header */}
      <header className="report-section flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Old St" className="report-logo h-9 w-auto" />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <div className="text-sm text-dim mt-1">
              {project.client_name ? `${project.client_name} · ` : ""}
              Progress report
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-dimmer">As of</div>
          <div className="font-mono text-sm">
            {format(new Date(project.cutoff), "d MMMM yyyy")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-dimmer mt-2">Scope</div>
          <div className="font-mono text-xs">{versionLabel}</div>
        </div>
      </header>

      {/* Intro */}
      <ReportSection title="Overview">
        <EditableText
          value={project.summary ?? ""}
          placeholder="Write a short introduction for the client…"
          className="glass rounded-2xl p-5 text-sm leading-relaxed"
        />
      </ReportSection>

      {/* Tiles */}
      <section className="report-section grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Tickets" value={String(totals.tickets_total)}>
          <div className="text-xs text-dim mt-1">
            {[
              `${totals.tickets_done} done`,
              devDone > 0 ? `${devDone} dev done` : null,
              totals.tickets_in_progress > 0 ? `${totals.tickets_in_progress} active` : null,
              totals.tickets_backlog > 0 ? `${totals.tickets_backlog} backlog` : null,
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
        {project.rate_per_hour > 0 && (
          <Tile label="Cost" value={formatGBP(effectiveActual * project.rate_per_hour)}>
            <div className="text-xs text-dim mt-1">of {formatGBP(totals.cost_estimate)}</div>
          </Tile>
        )}
        {month && <MonthTile month={month} showRate={project.rate_per_hour > 0} />}
      </section>

      {/* Discipline bars */}
      <ReportSection title="Frontend & Backend">
        <div className="glass rounded-2xl p-5 space-y-4">
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
      </ReportSection>

      {/* Estimate trend */}
      <ReportSection title="Estimate trend over time">
        <div className="glass rounded-2xl p-5">
          <div style={{ height: 260 }}>
            <TrendChart data={trend} />
          </div>
        </div>
      </ReportSection>

      {/* Timeline */}
      <ReportSection title="Sprint timeline">
        <div className="report-scroll report-gantt">
          <SprintGanttOrEmpty
            projectId={project.id}
            versions={project.versions ?? undefined}
          />
        </div>
      </ReportSection>

      <ReportEpics epics={visibleEpics} />
      <ReportDiscounts discounts={discounts} epics={epics} />
      <ReportChangeRequests crs={crs} />
      <ReportTotals
        totals={totals}
        discountHours={discountHours}
        effectiveActual={effectiveActual}
        ratePerHour={project.rate_per_hour}
      />

      {/* Closing note */}
      <ReportSection title="Next steps">
        <EditableText
          value=""
          placeholder="Add a closing note for the client…"
          className="glass rounded-2xl p-5 text-sm leading-relaxed min-h-[64px]"
        />
      </ReportSection>

      <footer className="report-section text-[10px] text-dimmer text-center pt-2 space-y-1">
        <div>
          {project.name} · Report generated {format(new Date(), "d MMMM yyyy")}
        </div>
        {publicUrl && <div>Live timeline and detail: {publicUrl}</div>}
      </footer>
    </div>
  );
}
