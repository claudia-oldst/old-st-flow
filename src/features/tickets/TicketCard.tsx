import { cn, displayTitle, formatHours, healthRatio } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Bug, GitPullRequest, FileText } from "lucide-react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";

const HEALTH_BG: Record<string, string> = {
  good: "bg-health-good",
  warn: "bg-health-warn",
  bad: "bg-health-bad",
  none: "bg-white/15",
};

function Bar({ label, actual, estimate }: { label: string; actual: number; estimate: number }) {
  const ratio = estimate > 0 ? Math.min(actual / estimate, 1.2) : 0;
  const pct = Math.min(ratio * 100, 100);
  const overflow = ratio > 1;
  const health = healthRatio(actual, estimate);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-dimmer">{label}</span>
        <span className="font-mono ticker text-dim">
          {formatHours(actual)}
          <span className="text-dimmer"> / {formatHours(estimate)}</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden relative">
        <div className={cn("h-full transition-all", HEALTH_BG[health])} style={{ width: `${pct}%` }} />
        {overflow && (
          <div className="absolute inset-y-0 right-0 w-1 bg-health-bad" />
        )}
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: TicketRow["ticket_type"] }) {
  if (type === "Bug") return <Bug className="h-3 w-3 text-rose-400" />;
  if (type === "CR") return <GitPullRequest className="h-3 w-3 text-amber-400" />;
  return <FileText className="h-3 w-3 text-dimmer" />;
}

export function TicketCard({
  ticket,
  onClick,
  isDragging,
}: {
  ticket: TicketRow;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const fe = ticket.assignees.filter((a) => a.slot === "FE").map((a) => a.member);
  const be = ticket.assignees.filter((a) => a.slot === "BE").map((a) => a.member);
  const showFE = ticket.current_fe_estimate > 0 || ticket.actual_frontend_hours > 0 || fe.length > 0;
  const showBE = ticket.current_be_estimate > 0 || ticket.actual_backend_hours > 0 || be.length > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-xl p-3 cursor-pointer transition select-none",
        "bg-surface-2 hairline hover:bg-surface-3",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <TypeIcon type={ticket.ticket_type} />
        <span className="font-mono text-[10px] text-dimmer">{ticket.formatted_id}</span>
      </div>
      <div className="text-sm leading-snug mb-2 line-clamp-2">
        {displayTitle(ticket.title, ticket.ticket_type)}
      </div>

      {(showFE || showBE) && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {showFE && <DisciplineStatusChip slot="FE" status={ticket.fe_status} />}
          {showBE && <DisciplineStatusChip slot="BE" status={ticket.be_status} />}
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {showFE && <Bar label="FE" actual={ticket.actual_frontend_hours} estimate={ticket.current_fe_estimate} />}
        {showBE && <Bar label="BE" actual={ticket.actual_backend_hours} estimate={ticket.current_be_estimate} />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-dimmer">
          {fe.length > 0 && (
            <div className="flex items-center gap-1">
              <span>FE</span>
              <div className="flex -space-x-1.5">
                {fe.map((m) => <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />)}
              </div>
            </div>
          )}
          {be.length > 0 && (
            <div className="flex items-center gap-1">
              <span>BE</span>
              <div className="flex -space-x-1.5">
                {be.map((m) => <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />)}
              </div>
            </div>
          )}
          {fe.length === 0 && be.length === 0 && <span>Unassigned</span>}
        </div>
      </div>
    </div>
  );
}
