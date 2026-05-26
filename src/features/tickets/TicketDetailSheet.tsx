import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectRole, canManageTickets } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { AssignDialog } from "@/features/tickets/AssignDialog";
import { LogTimeModal } from "@/features/timelog/LogTimeModal";
import { RequestMoreTimeDialog } from "@/features/tickets/RequestMoreTimeDialog";
import { useTicketEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { TicketComments } from "@/features/comments/TicketComments";
import { AcceptanceCriteria } from "./detail/AcceptanceCriteria";
import { TicketDetailHeader } from "./detail/TicketDetailHeader";
import { TicketDetailBody } from "./detail/TicketDetailBody";
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
  const canManage = canManageTickets(role);
  const canEditFE = hasFE && (canManage || myFE);
  const canEditBE = hasBE && (canManage || myBE);
  const canEditProj = isProj && (canManage || isMine);
  const isPMBARole = canManage;

  const defaultTab =
    ticket.acceptance_criteria && ticket.acceptance_criteria.trim() ? "acceptance" : "detail";

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

          <Tabs defaultValue={defaultTab} className="mt-6 flex-1 flex flex-col min-h-0">
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
              <TicketDetailBody
                ticket={ticket}
                projectId={projectId}
                status={status}
                statuses={statuses}
                isProj={isProj}
                isPMBARole={isPMBARole}
                hasFE={hasFE}
                hasBE={hasBE}
                canEditFE={canEditFE}
                canEditBE={canEditBE}
                canEditProj={canEditProj}
                canLog={canLog}
                editor={editor}
                estimateChanges={estimateChanges}
                logsReloadKey={logsReloadKey}
                onAssign={() => setAssignOpen(true)}
                onOpenLog={() => setLogOpen(true)}
                onAdjustEstimate={(slot) => {
                  setRequestSlot(slot);
                  setRequestOpen(true);
                }}
                onChange={onChange}
              />
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
