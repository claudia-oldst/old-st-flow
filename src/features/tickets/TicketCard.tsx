import { useState } from "react";
import { cn, displayTitle, formatHours, healthRatio } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Bug, GitPullRequest, FileText, FolderKanban, Play } from "lucide-react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_CARD_PREFS, type CardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { LogTimeWithCapacityCheck } from "@/features/timelog/LogTimeWithCapacityCheck";
import { useProjectRole } from "@/features/team/useProjectRole";
import type { LogDiscipline } from "@/lib/types";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";
import { useStatuses } from "@/features/statuses/useStatuses";

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
  prefs = DEFAULT_CARD_PREFS,
  forceBars = false,
  showQuickStart = false,
  currentUserId,
  forcedDiscipline,
}: {
  ticket: TicketRow;
  onClick?: () => void;
  isDragging?: boolean;
  prefs?: CardDisplayPrefs;
  forceBars?: boolean;
  showQuickStart?: boolean;
  currentUserId?: string;
  forcedDiscipline?: LogDiscipline;
}) {
  const isProj = ticket.ticket_type === "Proj";
  const fe = ticket.assignees.filter((a) => a.slot === "FE").map((a) => a.member);
  const be = ticket.assignees.filter((a) => a.slot === "BE").map((a) => a.member);
  const team = ticket.assignees.filter((a) => a.slot === "Project").map((a) => a.member);
  const hasFE = fe.length > 0;
  const hasBE = be.length > 0;
  const barsOn = prefs.bars || forceBars;
  const showFEBar = barsOn && !isProj && hasFE && (ticket.current_fe_estimate > 0 || ticket.actual_frontend_hours > 0);
  const showBEBar = barsOn && !isProj && hasBE && (ticket.current_be_estimate > 0 || ticket.actual_backend_hours > 0);
  const showProjectBar = barsOn && isProj && (ticket.current_project_estimate > 0 || ticket.actual_project_hours > 0);
  const showChips = prefs.chips && !isProj && (hasFE || hasBE);
  const anyBars = showFEBar || showBEBar || showProjectBar;
  const showHeaderRow = prefs.type || prefs.id;

  // activeTimer no longer gates the play button — it now opens the Log Time modal.
  const role = useProjectRole(ticket.project_id);
  const [logOpen, setLogOpen] = useState(false);
  const mySlots: ("FE" | "BE" | "Project")[] = currentUserId
    ? Array.from(
        new Set(
          ticket.assignees
            .filter((a) => a.user_id === currentUserId)
            .map((a) => a.slot as "FE" | "BE" | "Project")
        )
      )
    : [];
  const canQuickStart =
    showQuickStart && !!currentUserId && mySlots.length > 0;

  const handleQuickStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogOpen(true);
  };

  const { statuses } = useStatuses();
  const projectStatus = ticket.status_id ? statuses.find((s) => s.id === ticket.status_id) : null;

  return (
    <>
    <div
      onClick={onClick}
      className={cn(
        "relative group rounded-xl p-3 cursor-pointer transition select-none",
        "bg-surface-2 hairline hover:bg-surface-3",
        isDragging && "opacity-40"
      )}
    >
      {/* "P" badge for Proj tickets — black corner dot with white P */}
      {isProj && prefs.projBadge && (
        <span
          className="absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full text-[10px] font-bold ring-1 ring-white/15 flex items-center justify-center"
          style={{ background: "#000", color: "#fff" }}
          aria-label="Project ticket"
          title="Project ticket"
        >
          P
        </span>
      )}

      {canQuickStart && (
        <button
          type="button"
          onClick={handleQuickStart}
          aria-label="Start timer on this ticket"
          title="Start timer"
          className={cn(
            "absolute z-20 h-6 w-6 rounded-full flex items-center justify-center",
            "bg-primary text-primary-foreground shadow ring-1 ring-white/10",
            "opacity-0 group-hover:opacity-100 focus:opacity-100 transition",
            isProj && prefs.projBadge ? "top-1.5 right-7" : "top-1.5 right-1.5"
          )}
        >
          <Play className="h-3 w-3 fill-current" />
        </button>
      )}

      {showHeaderRow && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {prefs.type && <TypeIcon type={ticket.ticket_type} />}
          {prefs.id && (
            <span className="font-mono text-[10px] text-dimmer inline-flex items-center gap-1 min-w-0">
              <span className="shrink-0">{ticket.formatted_id}</span>
              {ticket.epic_name && (
                <span className="truncate max-w-[140px]" title={ticket.epic_name}>
                  [{ticket.epic_name}]
                </span>
              )}
            </span>
          )}
          {ticket.ticket_type === "CR" && (
            <StatusBadge status={ticket.cr_approval} />
          )}
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("text-sm leading-snug line-clamp-2", (showChips || anyBars || prefs.assignees) ? "mb-2" : "")}>
            {displayTitle(ticket.title, ticket.ticket_type)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs">
          <p className="text-sm">{ticket.title}</p>
        </TooltipContent>
      </Tooltip>

      {showChips && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {hasFE && <DisciplineStatusChip slot="FE" status={ticket.fe_status} />}
          {hasBE && <DisciplineStatusChip slot="BE" status={ticket.be_status} />}
        </div>
      )}

      {anyBars && (
        <div className="space-y-1.5 mb-3">
          {showFEBar && <Bar label="FE" actual={ticket.actual_frontend_hours} estimate={ticket.current_fe_estimate} />}
          {showBEBar && <Bar label="BE" actual={ticket.actual_backend_hours} estimate={ticket.current_be_estimate} />}
          {showProjectBar && <Bar label="Project" actual={ticket.actual_project_hours} estimate={ticket.current_project_estimate} />}
        </div>
      )}

      {prefs.assignees && (
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
                {team.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>P</span>
                    <div className="flex -space-x-1.5">
                      {team.map((m) => <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />)}
                    </div>
                  </div>
                )}
                {fe.length === 0 && be.length === 0 && team.length === 0 && <span>Unassigned</span>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
    {logOpen && (
      <LogTimeWithCapacityCheck
        open={logOpen}
        onOpenChange={setLogOpen}
        ticket={ticket}
        role={role}
        userId={currentUserId}
      />
    )}
    </>
  );
}
