import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

/** Assignee chips, estimate burn bar and time-log count under the sheet header. */
export function TicketDetailMeta({
  ticket,
  logCount,
}: {
  ticket: TicketRow;
  logCount: number;
}) {
  const feAssignees = ticket.assignees.filter((a) => a.slot === "FE");
  const beAssignees = ticket.assignees.filter((a) => a.slot === "BE");
  const totalActual =
    ticket.actual_frontend_hours + ticket.actual_backend_hours + ticket.actual_project_hours;
  const totalEst =
    ticket.current_fe_estimate + ticket.current_be_estimate + ticket.current_project_estimate;
  const burnPct = totalEst > 0 ? (totalActual / totalEst) * 100 : 0;

  const chip = (slot: "FE" | "BE", a: TicketRow["assignees"][number]) => (
    <div key={`${slot}-${a.user_id}`} className="flex items-center gap-1.5">
      <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
      <span className="text-dim">{a.member.name}</span>
      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-dimmer">
        {slot}
      </span>
    </div>
  );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
      {feAssignees.map((a) => chip("FE", a))}
      {beAssignees.map((a) => chip("BE", a))}

      {totalEst > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative h-1.5 w-32 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                burnPct > 100
                  ? "bg-health-bad"
                  : burnPct > 80
                    ? "bg-health-warn"
                    : "bg-health-good",
              )}
              style={{ width: `${Math.min(100, burnPct)}%` }}
            />
          </div>
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
