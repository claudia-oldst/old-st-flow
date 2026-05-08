import { useState } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectRole, isPMBA, canManageTickets } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { AssignDialog } from "@/features/tickets/AssignDialog";
import { LogTimeModal } from "@/features/timelog/LogTimeModal";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { RequestMoreTimeDialog } from "@/features/tickets/RequestMoreTimeDialog";
import { useTicketEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { Users, Trash2 } from "lucide-react";
import { TicketComments } from "@/features/comments/TicketComments";
import { toast } from "sonner";
import { AssigneeBlock } from "./detail/AssigneeBlock";
import { AcceptanceCriteria } from "./detail/AcceptanceCriteria";
import { TimeLogsPanel } from "./detail/TimeLogsPanel";
import { TicketDetailHeader } from "./detail/TicketDetailHeader";
import { StatusBlock } from "./detail/StatusBlock";
import { EstimatesPanel } from "./detail/EstimatesPanel";
import { useTicketEditor } from "./detail/useTicketEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow | null;
  projectId: string;
  onChange: () => void;
}

export function TicketDetailSheet({ open, onOpenChange, ticket, projectId, onChange }: Props) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { statuses } = useStatuses();
  const [assignOpen, setAssignOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSlot, setRequestSlot] = useState<"FE" | "BE" | undefined>(undefined);
  const [logsReloadKey, setLogsReloadKey] = useState(0);
  const { changes: estimateChanges, reload: reloadChanges } =
    useTicketEstimateChanges(ticket?.id);

  const editor = useTicketEditor({
    ticket,
    userId: user?.id,
    onChange,
    onClose: () => onOpenChange(false),
    reloadChanges,
  });

  if (!ticket) return null;

  const isProj = ticket.ticket_type === "Proj";
  const status = statuses.find((s) => s.id === ticket.status_id);
  const isMine = !!user && ticket.assignees.some((a) => a.user_id === user.id);
  const canLog = isMine;
  const myFE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "FE");
  const myBE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "BE");
  const hasFE = !isProj && ticket.assignees.some((a) => a.slot === "FE");
  const hasBE = !isProj && ticket.assignees.some((a) => a.slot === "BE");
  const canEditFE = hasFE && (isPMBA(role) || myFE);
  const canEditBE = hasBE && (isPMBA(role) || myBE);
  const canEditProj = isProj && (isPMBA(role) || isMine);
  const isPMBARole = isPMBA(role);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="glass-strong w-full sm:max-w-xl flex flex-col overflow-hidden">
          <TicketDetailHeader
            ticket={ticket}
            status={status}
            editing={editor.editing}
            title={editor.title}
            setTitle={editor.setTitle}
          />

          <Tabs defaultValue={ticket.acceptance_criteria && ticket.acceptance_criteria.trim() ? "acceptance" : "detail"} className="mt-6 flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="acceptance">Acceptance</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="detail">Detail</TabsTrigger>
            </TabsList>

            <TabsContent value="acceptance" className="mt-4 space-y-6 flex-1 overflow-y-auto">
              <AcceptanceCriteria
                ticketId={ticket.id}
                value={ticket.acceptance_criteria}
                canEdit={isPMBARole}
                onSaved={onChange}
              />
            </TabsContent>

            <TabsContent value="detail" className="mt-4 space-y-6 flex-1 overflow-y-auto">
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
                onAssign={() => setAssignOpen(true)}
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
                onAdjustEstimate={(slot) => {
                  setRequestSlot(slot);
                  setRequestOpen(true);
                }}
                estimateChanges={estimateChanges}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider text-dimmer">Assignees</div>
                  {isPMBARole && (
                    <Button variant="ghost" size="sm" onClick={() => setAssignOpen(true)} className="gap-1 text-xs">
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
                onOpenLog={() => setLogOpen(true)}
                reloadKey={logsReloadKey}
              />

              {isPMBARole && (
                <div className="pt-4 hairline-t">
                  <Button variant="ghost" size="sm" onClick={editor.handleDelete} className="text-destructive hover:text-destructive gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Delete ticket
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="discussion" className="mt-4 flex-1 min-h-0 data-[state=active]:flex flex-col">
              <TicketComments ticketId={ticket.id} projectId={projectId} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {isPMBARole && (
        <AssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          ticketId={ticket.id}
          projectId={projectId}
          ticketType={ticket.ticket_type}
          current={ticket.assignees.map((a) => ({ user_id: a.user_id, slot: a.slot }))}
          onSaved={onChange}
        />
      )}
      {canLog && (
        <LogTimeModal
          open={logOpen}
          onOpenChange={setLogOpen}
          ticket={ticket}
          role={role}
          onLogged={() => {
            onChange();
            setLogsReloadKey((k) => k + 1);
          }}
        />
      )}

      {ticket && (canEditFE || canEditBE) && (
        <RequestMoreTimeDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          ticketId={ticket.id}
          currentFE={ticket.current_fe_estimate}
          currentBE={ticket.current_be_estimate}
          actualFE={ticket.actual_frontend_hours}
          actualBE={ticket.actual_backend_hours}
          allowedSlots={[
            ...(canEditFE ? (["FE"] as const) : []),
            ...(canEditBE ? (["BE"] as const) : []),
          ]}
          defaultSlot={requestSlot}
          onSaved={() => {
            onChange();
            reloadChanges();
          }}
        />
      )}
    </>
  );
}
