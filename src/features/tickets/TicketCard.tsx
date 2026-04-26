import { cn, displayTitle, formatHours, healthRatio } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Bug, GitPullRequest, FileText, FolderKanban } from "lucide-react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  if (type === "Proj") return <FolderKanban className="h-3 w-3 text-sky-400" />;
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
  const isProj = ticket.ticket_type === "Proj";
  const fe = ticket.assignees.filter((a) => a.slot === "FE").map((a) => a.member);
  const be = ticket.assignees.filter((a) => a.slot === "BE").map((a) => a.member);
  const team = ticket.assignees.filter((a) => a.slot === "Project").map((a) => a.member);
  const hasFE = fe.length > 0;
  const hasBE = be.length > 0;
  const showFEBar = !isProj && hasFE && (ticket.current_fe_estimate > 0 || ticket.actual_frontend_hours > 0);
  const showBEBar = !isProj && hasBE && (ticket.current_be_estimate > 0 || ticket.actual_backend_hours > 0);
  const showProjectBar = isProj && (ticket.current_project_estimate > 0 || ticket.actual_project_hours > 0);
  const showAnyChipsOrBars = !isProj && (hasFE || hasBE);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group rounded-xl p-3 cursor-pointer transition select-none",
        "bg-surface-2 hairline hover:bg-surface-3",
        isDragging && "opacity-40"
      )}
    >
      {/* "P" badge for Proj tickets — black corner dot with white P */}
      {isProj && (
        <span
          className="absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full text-[10px] font-bold ring-1 ring-white/15 flex items-center justify-center"
          style={{ background: "#000", color: "#fff" }}
          aria-label="Project ticket"
          title="Project ticket"
        >
          P
        </span>
      )}

      <div className="flex items-center gap-1.5 mb-1.5">
        <TypeIcon type={ticket.ticket_type} />
        <span className="font-mono text-[10px] text-dimmer">{ticket.formatted_id}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-sm leading-snug mb-2 line-clamp-2">
            {displayTitle(ticket.title, ticket.ticket_type)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs">
          <p className="text-sm">{ticket.title}</p>
        </TooltipContent>
      </Tooltip>

      {showAnyChipsOrBars && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {hasFE && <DisciplineStatusChip slot="FE" status={ticket.fe_status} />}
          {hasBE && <DisciplineStatusChip slot="BE" status={ticket.be_status} />}
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {showFEBar && <Bar label="FE" actual={ticket.actual_frontend_hours} estimate={ticket.current_fe_estimate} />}
        {showBEBar && <Bar label="BE" actual={ticket.actual_backend_hours} estimate={ticket.current_be_estimate} />}
        {showProjectBar && <Bar label="Project" actual={ticket.actual_project_hours} estimate={ticket.current_project_estimate} />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-dimmer">
          {isProj ? (
            team.length > 0 ? (
              <div className="flex items-center gap-1">
                <span>Team</span>
                <div className="flex -space-x-1.5">
                  {team.map((m) => <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />)}
                </div>
              </div>
            ) : (
              <span>Unassigned</span>
            )
          ) : (
            <>
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
              {other.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>O</span>
                  <div className="flex -space-x-1.5">
                    {other.map((m) => <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />)}
                  </div>
                </div>
              )}
              {fe.length === 0 && be.length === 0 && other.length === 0 && <span>Unassigned</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
