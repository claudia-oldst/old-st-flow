import { useMemo } from "react";
import { format } from "date-fns";
import { formatHours } from "@/lib/utils";
import { formatGBP, type PortalPayload, type PortalMonth } from "../types";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import { TrendChart } from "@/features/_shared/estimate-trend/TrendChart";
import { buildTrendSeries } from "@/features/_shared/estimate-trend/buildTrendSeries";
import { useTrendData } from "@/features/_shared/estimate-trend/useTrendData";
import { versionKeyOf } from "@/features/health/versionFilter";
import { SprintGanttOrEmpty } from "@/features/sprints/SprintGanttOrEmpty";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";
import { EditableText, ReportSection } from "./EditableText";
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
  const devDonePct =
    totals.tickets_total > 0 ? (devDone / totals.tickets_total) * 100 : 0;

  const visibleEpics = useMemo(
    () => epics.filter((e) => e.total_tickets > 0),
    [epics],
  );

  // ---- Estimate trend over time (aggregate, scoped to portal versions) ----
  const { dataset } = useTrendData(project.id);
  const { tickets, changes, logs, projectStart, ticketEpic, ticketVersion } = dataset;
  const cutoffMs = useMemo(() => new Date(project.cutoff).getTime(), [project.cutoff]);
  const versionSet = useMemo(
    () => (project.versions && project.versions.length ? new Set(project.versions) : null),
    [project.versions],
  );
  const includedIds = useMemo(
    () => new Set(visibleEpics.map((e) => e.id)),
    [visibleEpics],
  );
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
  const crs = useMemo(
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
    project.versions && project.versions.length
      ? project.versions.join(", ")
      : "All versions";

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
          <div className="text-[10px] uppercase tracking-wider text-dimmer mt-2">
            Scope
          </div>
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
              totals.tickets_in_progress > 0
                ? `${totals.tickets_in_progress} active`
                : null,
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
          <Tile
            label="Cost"
            value={formatGBP(effectiveActual * project.rate_per_hour)}
          >
            <div className="text-xs text-dim mt-1">
              of {formatGBP(totals.cost_estimate)}
            </div>
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

      {/* Epics */}
      <ReportSection title="Scope by epic">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3 px-4 py-2.5 hairline-b text-[10px] uppercase tracking-wider text-dimmer">
            <div>Epic</div>
            <div>Progress</div>
            <div className="text-right">Act / Cur / Orig</div>
          </div>
          {visibleEpics.map((e) => {
            const pct = (n: number) =>
              e.total_tickets > 0 ? (n / e.total_tickets) * 100 : 0;
            return (
              <div key={e.id} className="report-section hairline-b last:border-b-0">
                <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3 px-4 py-3 items-center">
                  <div className="text-sm">{e.epic_name ?? "Untitled epic"}</div>
                  <div>
                    <SegmentedBar
                      segments={[
                        { pct: pct(e.done_tickets), className: "bg-health-good" },
                        {
                          pct: pct(e.dev_done_tickets ?? 0),
                          className: "bg-health-good/50",
                        },
                        {
                          pct: pct(e.in_progress_tickets),
                          className: "bg-chart-in-progress",
                        },
                      ]}
                    />
                    <div className="text-[10px] text-dimmer mt-1">
                      {e.done_tickets}/{e.total_tickets} done
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    {formatHours(e.actual_hours)} / {formatHours(e.current_estimate)} /{" "}
                    {formatHours(e.original_estimate)}
                  </div>
                </div>
                {e.included !== false && (e.pmba_text ?? "").trim() !== "" && (
                  <EditableText
                    value={e.pmba_text ?? ""}
                    className="px-4 pb-3 text-xs leading-relaxed text-dim"
                  />
                )}
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* Discounts */}
      {discounts.length > 0 && (
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
                  <div className="font-mono text-right">
                    −{formatHours(Number(d.hours))}
                  </div>
                  <div className="font-mono text-right text-dimmer">
                    {format(new Date(d.applied_at), "d MMM yyyy")}
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}

      {/* Change requests */}
      {crs.length > 0 && (
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
      )}

      {/* Totals */}
      <ReportSection title="Totals">
        <div className="glass rounded-2xl overflow-hidden">
          <TotalRow label="Actual hours" value={formatHours(totals.actual_total)} />
          <TotalRow label="Current estimate" value={formatHours(totals.current_total)} />
          <TotalRow label="Original estimate" value={formatHours(totals.original_total)} />
          {discountHours > 0 && (
            <TotalRow label="Credits applied" value={`−${formatHours(discountHours)}`} />
          )}
          <TotalRow label="Billable hours" value={formatHours(effectiveActual)} />
          {project.rate_per_hour > 0 && (
            <>
              <TotalRow
                label="Rate"
                value={`${formatGBP(project.rate_per_hour)} per hour`}
              />
              <TotalRow
                label="Total cost to date"
                value={formatGBP(effectiveActual * project.rate_per_hour)}
              />
            </>
          )}
        </div>
      </ReportSection>

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
      <div className="text-[10px] uppercase tracking-wider text-dimmer">{label}</div>
      <div className="font-mono ticker text-2xl mt-1">{value}</div>
      {children}
    </div>
  );
}

function MonthTile({ month, showRate }: { month: PortalMonth; showRate: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">
        {format(new Date(month.start), "MMMM yyyy")} to date
      </div>
      <div className="font-mono ticker text-2xl mt-1">
        {showRate ? formatGBP(month.cost) : formatHours(month.billed_hours)}
      </div>
      <div className="mt-3 space-y-1">
        <MiniRow label="Frontend" value={formatHours(month.fe_actual)} />
        <MiniRow label="Backend" value={formatHours(month.be_actual)} />
        <MiniRow label="Project" value={formatHours(month.proj_actual)} />
        {month.discount_hours > 0 && (
          <MiniRow label="Discounted" value={`−${formatHours(month.discount_hours)}`} />
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

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-dim">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hairline-b last:border-b-0 text-sm">
      <span className="text-dim">{label}</span>
      <span className="font-mono">{value}</span>
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
