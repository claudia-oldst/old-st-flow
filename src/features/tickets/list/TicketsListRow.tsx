import { useState } from "react";
import { Play } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle, formatHours, cn } from "@/lib/utils";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import type { Status } from "@/lib/types";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";
import { LogTimeWithCapacityCheck } from "@/features/timelog/LogTimeWithCapacityCheck";
import { useProjectRole } from "@/features/team/useProjectRole";
import { COLS, ColKey } from "./columns";
import { GithubIssueBadge } from "@/features/github/GithubIssueBadge";
import type { PoolData } from "./poolData";

export function TicketsListRow({
  t,
  visibleCols,
  selectionEnabled,
  selected,
  onOpen,
  onToggleSelect,
  showQuickStart,
  currentUserId,
  statuses,
  groupKey,
  poolData,
}: {
  t: TicketRow;
  visibleCols: ColKey[];
  selectionEnabled: boolean;
  selected: boolean;
  onOpen: (t: TicketRow) => void;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  showQuickStart: boolean;
  currentUserId?: string;
  statuses: Status[];
  groupKey: string;
  poolData?: PoolData;
}) {

  // activeTimer no longer gates the play button — it now opens the Log Time modal.
  const role = useProjectRole(t.project_id);
  const [logOpen, setLogOpen] = useState(false);

  const renderCell = (key: ColKey) => {
    switch (key) {
      case "id":
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs text-dimmer">{t.formatted_id}</span>
            <GithubIssueBadge projectId={t.project_id} issueNumber={t.github_issue_number} />
            {t.ticket_type === "CR" && (
              <StatusBadge status={t.cr_approval} />
            )}
          </span>
        );
      case "title": {
        const mySlots: ("FE" | "BE" | "Project")[] = currentUserId
          ? Array.from(
              new Set(
                t.assignees
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
        return (
          <span className="group/title flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block flex-1 min-w-0">
                  {displayTitle(t.title, t.ticket_type)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-md">
                <p className="text-sm">{t.title}</p>
              </TooltipContent>
            </Tooltip>
            {canQuickStart && (
              <button
                type="button"
                onClick={handleQuickStart}
                aria-label="Start timer on this ticket"
                title="Start timer"
                className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow ring-1 ring-white/10 opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition"
              >
                <Play className="h-2.5 w-2.5 fill-current" />
              </button>
            )}
          </span>
        );
      }
      case "epic":
        return (
          <span className="text-xs text-dim truncate block">
            {t.epic_name ?? <span className="text-dimmer">—</span>}
          </span>
        );
      case "version":
        return t.version ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hairline text-dim">
            {t.version}
          </span>
        ) : (
          <span className="text-dimmer text-xs">—</span>
        );
      case "status": {
        const status = statuses.find((s) => s.id === t.status_id);
        if (!status) return null;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs min-w-0">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: status.color }} />
            <span className="truncate">{status.name}</span>
          </span>
        );
      }
      case "dev_status": {
        const hasFE = t.assignees.some((a) => a.slot === "FE");
        const hasBE = t.assignees.some((a) => a.slot === "BE");
        if (!hasFE && !hasBE) {
          return <span className="text-dimmer text-xs">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            {hasFE && <DisciplineStatusChip slot="FE" status={t.fe_status} />}
            {hasBE && <DisciplineStatusChip slot="BE" status={t.be_status} />}
          </span>
        );
      }
      case "fe":
        if (t.ticket_type === "Proj") {
          return <span className="text-dimmer text-xs">—</span>;
        }
        return (
          <span className="text-xs font-mono text-dim whitespace-nowrap">
            {formatHours(t.actual_frontend_hours)} / {formatHours(t.current_fe_estimate)}
          </span>
        );
      case "be":
        if (t.ticket_type === "Proj") {
          return (
            <span className="text-xs font-mono text-dim whitespace-nowrap">
              {formatHours(t.actual_project_hours)} / {formatHours(t.current_project_estimate)}
            </span>
          );
        }
        return (
          <span className="text-xs font-mono text-dim whitespace-nowrap">
            {formatHours(t.actual_backend_hours)} / {formatHours(t.current_be_estimate)}
          </span>
        );
      case "assignees":
        return (
          <span className="text-xs text-dim truncate block">
            {t.assignees.length === 0
              ? "—"
              : t.assignees.map((a) => a.member.name).join(", ")}
          </span>
        );
      case "fe_pool":
      case "be_pool": {
        const disc = key === "fe_pool" ? "fe" : "be";
        const activeNums = poolData?.activeByTicket.get(t.id)?.[disc] ?? [];
        if (activeNums.length > 0) {
          return (
            <span className="inline-flex items-center gap-1 flex-wrap">
              {activeNums.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent hairline"
                >
                  S{n}
                </span>
              ))}
            </span>
          );
        }
        const sid = poolData?.byTicket.get(t.id)?.[disc] ?? null;
        const num = sid ? poolData?.sprintsById.get(sid)?.sprint_number : undefined;
        if (!num) return <span className="text-dimmer text-xs">—</span>;
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hairline text-dim">
            S{num}
          </span>
        );
      }
    }

  };

  return (
    <>
      <tr
        key={`${groupKey}-${t.id}`}
        onClick={() => onOpen(t)}
        className={cn(
          "cursor-pointer transition hairline-b last:border-b-0",
          selected ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-white/[0.02]"
        )}
      >
        {selectionEnabled && (
          <td className="pl-4 pr-1 align-middle">
            <input
              type="checkbox"
              aria-label={`Select ticket ${t.formatted_id}`}
              checked={selected}
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect!(t.id, (e as unknown as React.MouseEvent).shiftKey);
              }}
              className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-accent cursor-pointer"
            />
          </td>
        )}
        {visibleCols.map((k) => {
          const c = COLS[k];
          return (
            <td
              key={k}
              className={cn(
                "px-4 py-3 align-middle overflow-hidden",
                c.align === "right" && "text-right"
              )}
            >
              {renderCell(k)}
            </td>
          );
        })}
      </tr>
      {logOpen && (
        <LogTimeWithCapacityCheck
          open={logOpen}
          onOpenChange={setLogOpen}
          ticket={t}
          role={role}
          userId={currentUserId}
        />
      )}
    </>
  );
}
