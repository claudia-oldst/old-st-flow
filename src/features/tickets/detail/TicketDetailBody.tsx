import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { AssigneeBlock } from "./AssigneeBlock";
import { StatusBlock } from "./StatusBlock";
import { EstimatesPanel } from "./EstimatesPanel";
import { TimeLogsPanel } from "./TimeLogsPanel";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import type { useTicketEditor } from "./useTicketEditor";

interface Props {
  ticket: TicketRow;
  projectId: string;
  status: Status | undefined;
  statuses: Status[];
  isProj: boolean;
  isPMBARole: boolean;
  hasFE: boolean;
  hasBE: boolean;
  canEditFE: boolean;
  canEditBE: boolean;
  canEditProj: boolean;
  canLog: boolean;
  editor: ReturnType<typeof useTicketEditor>;
  estimateChanges: Parameters<typeof EstimatesPanel>[0]["estimateChanges"];
  logsReloadKey: number;
  onAssign: () => void;
  onOpenLog: () => void;
  onAdjustEstimate: (slot: "FE" | "BE") => void;
  onChange: () => void;
}

export function TicketDetailBody({
  ticket,
  projectId,
  status,
  statuses,
  isProj,
  isPMBARole,
  hasFE,
  hasBE,
  canEditFE,
  canEditBE,
  canEditProj,
  canLog,
  editor,
  estimateChanges,
  logsReloadKey,
  onAssign,
  onOpenLog,
  onAdjustEstimate,
  onChange,
}: Props) {
  return (
    <>
      {isPMBARole && (
        <div>
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Epic</div>
          <EpicSelect
            projectId={projectId}
            value={ticket.epic_id}
            onChange={async (id) => {
              const { error } = await supabase
                .from("tickets")
                .update({ epic_id: id })
                .eq("id", ticket.id);
              if (error) return toast.error(error.message);
              onChange();
            }}
          />
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Version</div>
        {isPMBARole ? (
          <Input
            defaultValue={ticket.version ?? ""}
            placeholder="e.g. v1, MVP, Phase 2"
            className="h-8 text-sm"
            onBlur={async (e) => {
              const next = e.target.value.trim() || null;
              if ((next ?? null) === (ticket.version ?? null)) return;
              const { error } = await supabase
                .from("tickets")
                .update({ version: next })
                .eq("id", ticket.id);
              if (error) return toast.error(error.message);
              onChange();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <span className="text-sm text-dim">
            {ticket.version ?? <span className="text-dimmer">—</span>}
          </span>
        )}
      </div>

      <StatusBlock
        ticket={ticket}
        statuses={statuses}
        status={status}
        isPMBARole={isPMBARole}
        isProj={isProj}
        hasFE={hasFE}
        hasBE={hasBE}
        canEditFE={canEditFE}
        canEditBE={canEditBE}
        onAssign={onAssign}
        onChange={onChange}
      />

      <EstimatesPanel
        ticket={ticket}
        isProj={isProj}
        isPMBARole={isPMBARole}
        canEditFE={canEditFE}
        canEditBE={canEditBE}
        canEditProj={canEditProj}
        editing={editor.editing}
        setEditing={editor.setEditing}
        feEst={editor.feEst} setFeEst={editor.setFeEst}
        beEst={editor.beEst} setBeEst={editor.setBeEst}
        projEst={editor.projEst} setProjEst={editor.setProjEst}
        onSave={editor.handleSaveEdit}
        onAdjustEstimate={onAdjustEstimate}
        estimateChanges={estimateChanges}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-dimmer">Assignees</div>
          {isPMBARole && (
            <Button variant="ghost" size="sm" onClick={onAssign} className="gap-1 text-xs">
              <Users className="h-3 w-3" /> Manage
            </Button>
          )}
        </div>
        {isProj ? (
          <AssigneeBlock label="Members" assignees={ticket.assignees.filter(a => a.slot === "Project")} />
        ) : (
          <>
            <AssigneeBlock label="Frontend" assignees={ticket.assignees.filter(a => a.slot === "FE")} />
            <AssigneeBlock label="Backend" assignees={ticket.assignees.filter(a => a.slot === "BE")} />
            {ticket.assignees.some((a) => a.slot === "Project") && (
              <AssigneeBlock label="Project contributors" assignees={ticket.assignees.filter(a => a.slot === "Project")} />
            )}
          </>
        )}
      </div>

      <TimeLogsPanel
        ticketId={ticket.id}
        canLog={canLog}
        onOpenLog={onOpenLog}
        reloadKey={logsReloadKey}
      />

      {isPMBARole && (
        <div className="pt-4 hairline-t">
          <Button variant="ghost" size="sm" onClick={editor.handleDelete} className="text-destructive hover:text-destructive gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete ticket
          </Button>
        </div>
      )}
    </>
  );
}
