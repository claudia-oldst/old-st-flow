import { format } from "date-fns";
import { cn, formatHours } from "@/lib/utils";
import { formatGBP, type PortalPayload } from "./types";
import { PortalEpicTrend } from "./PortalEpicTrend";

/**
 * Visual render of the client-facing portal payload.
 * Shared between the PMBA editor preview and the public /h/:hash route.
 */
export function PortalView({
  payload,
  showRate,
}: {
  payload: PortalPayload;
  showRate: boolean;
}) {
  const { project, totals, epics } = payload;
  const completionPct =
    totals.tickets_total > 0
      ? Math.round((totals.tickets_done / totals.tickets_total) * 100)
      : 0;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile label="Tickets" value={String(totals.tickets_total)}>
          <div className="text-xs text-dim mt-1">
            {totals.tickets_done} done · {totals.tickets_in_progress} in progress
            {totals.tickets_backlog > 0 && ` · ${totals.tickets_backlog} to do`}
          </div>
        </Tile>
        <Tile label="Progress" value={`${completionPct}%`}>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-health-good transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </Tile>
        {showRate && project.rate_per_hour > 0 && (
          <Tile label="Cost" value={formatGBP(totals.cost_actual)}>
            <div className="text-xs text-dim mt-1">
              of {formatGBP(totals.cost_estimate)}
            </div>
          </Tile>
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

      {/* Epics */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-dimmer px-1">
          Epics
        </div>
        <PortalEpicTrend
          projectId={project.id}
          cutoff={project.cutoff}
          includedEpics={epics
            .filter((e) => e.total_tickets > 0)
            .map((e) => ({ id: e.id, name: e.epic_name ?? "Untitled epic" }))}
        />
        {epics.length === 0 && (
          <div className="text-sm text-dim glass rounded-2xl p-5">
            No epics yet.
          </div>
        )}
        {epics
          .filter((e) => e.total_tickets > 0)
          .map((e) => {
            const pct =
              e.total_tickets > 0
                ? Math.round((e.done_tickets / e.total_tickets) * 100)
                : 0;
            const delta = e.current_estimate - e.original_estimate;
            return (
              <div key={e.id} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-medium">{e.epic_name ?? "Untitled epic"}</div>
                  <div className="text-xs text-dim font-mono">
                    {pct}% done
                  </div>
                </div>
                <div className="text-xs text-dim">
                  {e.done_tickets} done
                  {e.in_progress_tickets > 0 && ` · ${e.in_progress_tickets} in progress`}
                  {e.backlog_tickets > 0 && ` · ${e.backlog_tickets} to do`}
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-dim flex-wrap">
                  <span>{formatHours(e.current_estimate)}</span>
                  {e.original_estimate > 0 && delta !== 0 && (
                    <>
                      <span className="text-dimmer">
                        (orig {formatHours(e.original_estimate)})
                      </span>
                      <span
                        className={
                          delta > 0 ? "text-health-warn" : "text-health-good"
                        }
                      >
                        {delta > 0 ? "+" : ""}
                        {formatHours(delta)}
                      </span>
                    </>
                  )}
                  {showRate && project.rate_per_hour > 0 && (
                    <span className="ml-auto">
                      {formatGBP(e.actual_hours * project.rate_per_hour)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Estimate Change Detail — only included epics with a delta and a PMBA narrative. */}
      {(() => {
        const detail = epics.filter(
          (e) =>
            (e.included ?? true) &&
            e.total_tickets > 0 &&
            e.current_estimate - e.original_estimate !== 0 &&
            (e.pmba_text ?? "").trim().length > 0,
        );
        if (detail.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-dimmer px-1">
              Estimate Change Detail
            </div>
            {detail.map((e) => {
              const delta = e.current_estimate - e.original_estimate;
              return (
                <div key={e.id} className="glass rounded-2xl p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-medium">{e.epic_name ?? "Untitled epic"}</div>
                    <div
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full ring-1",
                        delta > 0
                          ? "bg-health-warn/15 text-health-warn ring-health-warn/30"
                          : "bg-health-good/15 text-health-good ring-health-good/30",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {formatHours(delta)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] hairline p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {e.pmba_text}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

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
      <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
        <div className="h-full bg-health-good" style={{ width: `${donePct}%` }} />
        <div
          className="h-full"
          style={{ width: `${ipPct}%`, background: "hsl(217 91% 60%)" }}
        />
      </div>
    </div>
  );
}
