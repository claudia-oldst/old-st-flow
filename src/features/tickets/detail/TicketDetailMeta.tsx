import { cn, formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

/** Estimate burn and time-log count under the sheet header. */
export function TicketDetailMeta({
  ticket,
  logCount,
}: {
  ticket: TicketRow;
  logCount: number;
}) {
  const totalActual =
    ticket.actual_frontend_hours + ticket.actual_backend_hours + ticket.actual_project_hours;
  const totalEst =
    ticket.current_fe_estimate + ticket.current_be_estimate + ticket.current_project_estimate;
  const burnPct = totalEst > 0 ? (totalActual / totalEst) * 100 : 0;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">

      {totalEst > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span
            className={cn(
              "font-mono text-[11px]",
              burnPct > 100 ? "text-health-bad" : burnPct > 80 ? "text-health-warn" : "text-dim",
            )}
          >
            {formatHours(totalActual)} / {formatHours(totalEst)}
          </span>
        </div>
      )}

      <span className={cn("text-dimmer text-[11px]", totalEst > 0 ? "" : "ml-auto")}>
        {logCount} time log{logCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
