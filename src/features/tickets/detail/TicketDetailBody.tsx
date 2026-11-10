import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EpicSelect } from "@/features/epics/EpicSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RelatedTickets } from "./RelatedTickets";
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
  onLocalPatch?: (patch: Partial<TicketRow>) => void;
  onLogCount?: (n: number) => void;
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
  onLocalPatch,
  onLogCount,
}: Props) {
  // Feedback tickets are in triage: no dev status, assignees or time tracking until converted.
  const isFeedback = ticket.ticket_type === "Feedback";
  const showParent = ticket.ticket_type !== "Proj";

  return (
    <>
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
          onLocalPatch={onLocalPatch}
        />


      <EstimatesPanel
        ticket={ticket}
        isProj={isProj}
        isPMBARole={isPMBARole}
        isFeedback={isFeedback}
        onAssign={onAssign}
        canEditFE={canEditFE}
        canEditBE={canEditBE}
        canEditProj={canEditProj}
        editing={editor.editing}
        setEditing={editor.setEditing}
        feEst={editor.feEst} setFeEst={editor.setFeEst}
        beEst={editor.beEst} setBeEst={editor.setBeEst}
        projEst={editor.projEst} setProjEst={editor.setProjEst}
        onSave={editor.handleSaveEdit}
        onAdjustEstimate={isFeedback ? () => editor.setEditing(true) : onAdjustEstimate}
        estimateChanges={isFeedback ? [] : estimateChanges}
      />

      <div className={`grid gap-4 grid-cols-2`}>
        <div>
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Epic</div>
          {isPMBARole ? (
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
          ) : (
            <span className="text-sm text-dim">
              {ticket.epic_name ?? <span className="text-dimmer">—</span>}
            </span>
          )}
        </div>

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

      </div>

      {!isFeedback && (
        <>
          <RelatedTickets
            ticket={ticket}
            projectId={projectId}
            statuses={statuses}
            isPMBARole={isPMBARole}
            canHaveParent={showParent}
            onChange={onChange}
          />

          <TimeLogsPanel
            ticket={ticket}
            canLog={canLog}
            onOpenLog={onOpenLog}
            reloadKey={logsReloadKey}
            onLogCount={onLogCount}
          />
        </>
      )}

      <div className="pt-4 hairline-t flex items-center justify-between">
        <span className="text-[11px] text-dimmer">
          Updated {format(new Date(ticket.created_at), "d MMM yyyy")}
        </span>
        {isPMBARole && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={editor.handleDelete}
                className="text-destructive focus:text-destructive gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
}
