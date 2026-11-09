import { Edit3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn, formatHours } from "@/lib/utils";
import { EstimateChangesPanel } from "./EstimateChangesPanel";

type Assignee = TicketRow["assignees"][number];

function TimeRow({
  label,
  assignees,
  actual,
  estimate,
  original,
  onAssign,
  actionLabel,
  onAction,
  showAssignees,
}: {
  label: string;
  assignees: Assignee[];
  actual: number;
  estimate: number;
  original: number;
  onAssign?: () => void;
  actionLabel: string;
  onAction?: () => void;
  showAssignees: boolean;
}) {
  const r = estimate > 0 ? actual / estimate : 0;
  const tone = r > 1 ? "bg-health-bad" : r >= 0.8 ? "bg-health-warn" : "bg-health-good";
  const delta = estimate - original;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-16 text-xs font-medium text-dim">{label}</div>
      {showAssignees && (
        <div className="flex items-center gap-1 min-w-[4.5rem]">
          {assignees.map((a) => (
            <span key={a.user_id} title={a.member.name}>
              <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
            </span>
          ))}
          {onAssign && (
            <button
              type="button"
              onClick={onAssign}
              aria-label={`Assign ${label}`}
              className="h-5 w-5 grid place-items-center rounded-full border border-dashed border-border text-dimmer hover:text-foreground transition"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <div className="relative h-1.5 flex-1 min-w-24 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", actual > 0 ? tone : "bg-transparent")}
          style={{ width: `${Math.min(100, r * 100)}%` }}
        />
      </div>
      <div className="w-32">
        <div className="font-mono text-sm">
          {formatHours(actual)} <span className="text-dimmer">/ {formatHours(estimate)}</span>
        </div>
        {delta !== 0 && (
          <div className="text-[10px] text-dimmer">
            Originally {formatHours(original)}{" "}
            <span className="text-brand-gold">({delta > 0 ? "+" : ""}{formatHours(delta)})</span>
          </div>
        )}
      </div>
      {onAction && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function EstimatesPanel({
  ticket,
  isProj,
  isPMBARole,
  isFeedback = false,
  canEditFE,
  canEditBE,
  canEditProj,
  editing,
  setEditing,
  feEst, setFeEst,
  beEst, setBeEst,
  projEst, setProjEst,
  onSave,
  onAdjustEstimate,
  onAssign,
  estimateChanges,
}: {
  ticket: TicketRow;
  isProj: boolean;
  isPMBARole: boolean;
  isFeedback?: boolean;
  canEditFE: boolean;
  canEditBE: boolean;
  canEditProj: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  feEst: string; setFeEst: (v: string) => void;
  beEst: string; setBeEst: (v: string) => void;
  projEst: string; setProjEst: (v: string) => void;
  onSave: () => void;
  onAdjustEstimate: (slot?: "FE" | "BE") => void;
  onAssign?: () => void;
  estimateChanges: any[];
}) {
  const by = (slot: string) => ticket.assignees.filter((a) => a.slot === slot);
  const actionLabel = isFeedback ? "Set estimate" : "Request more time";
  const assign = isPMBARole && !isFeedback ? onAssign : undefined;

  return (
    <section className="rounded-xl hairline bg-surface-2/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Time</h3>
        {(isPMBARole || (isProj && canEditProj)) && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-7 gap-1 text-xs">
            <Edit3 className="h-3 w-3" /> Edit estimates
          </Button>
        )}
      </div>

      {editing ? (
        isProj ? (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Project estimate (hrs)</Label>
              <Input type="number" step="0.5" value={projEst} onChange={(e) => setProjEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_project_estimate)}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">FE estimate (hrs)</Label>
              <Input type="number" step="0.5" value={feEst} onChange={(e) => setFeEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_fe_estimate)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BE estimate (hrs)</Label>
              <Input type="number" step="0.5" value={beEst} onChange={(e) => setBeEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_be_estimate)}</div>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave}>Save</Button>
            </div>
          </div>
        )
      ) : isProj ? (
        <TimeRow
          label="Project"
          assignees={by("Project")}
          actual={ticket.actual_project_hours}
          estimate={ticket.current_project_estimate}
          original={ticket.original_project_estimate}
          onAssign={assign}
          actionLabel={actionLabel}
          showAssignees={!isFeedback}
        />
      ) : (
        <div className="space-y-3">
          <TimeRow
            label="FE"
            assignees={by("FE")}
            actual={ticket.actual_frontend_hours}
            estimate={ticket.current_fe_estimate}
            original={ticket.original_fe_estimate}
            onAssign={assign}
            actionLabel={actionLabel}
            onAction={canEditFE ? () => onAdjustEstimate("FE") : undefined}
            showAssignees={!isFeedback}
          />
          <TimeRow
            label="BE"
            assignees={by("BE")}
            actual={ticket.actual_backend_hours}
            estimate={ticket.current_be_estimate}
            original={ticket.original_be_estimate}
            onAssign={assign}
            actionLabel={actionLabel}
            onAction={canEditBE ? () => onAdjustEstimate("BE") : undefined}
            showAssignees={!isFeedback}
          />
          {(by("Project").length > 0 || ticket.actual_project_hours > 0) && (
            <TimeRow
              label="Project"
              assignees={by("Project")}
              actual={ticket.actual_project_hours}
              estimate={ticket.current_project_estimate}
              original={ticket.current_project_estimate}
              actionLabel={actionLabel}
              showAssignees
            />
          )}
        </div>
      )}

      <EstimateChangesPanel changes={estimateChanges as any} />
    </section>
  );
}
