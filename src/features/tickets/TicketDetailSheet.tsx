import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
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
import { OPEN_TICKET_EVENT } from "@/features/tickets/openTicketEvent";
import { fetchTicketById } from "@/features/tickets/fetchTicketById";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow | null;
  projectId: string;
  onChange: () => void;
}

export function TicketDetailSheet({ open, onOpenChange, ticket: ticketProp, projectId, onChange }: Props) {
  const [liveTicket, setLiveTicket] = useState<TicketRow | null>(ticketProp);

  // Sync from prop (new ticket opened, or parent reloaded list)
  useEffect(() => {
    setLiveTicket(ticketProp);
  }, [ticketProp]);

  // Subscribe to realtime updates for this specific ticket so the detail view
  // reflects status / field changes the moment they are persisted, even before
  // the parent list refetch resolves.
  useEffect(() => {
    if (!ticketProp?.id) return;
    const id = ticketProp.id;
    const channel = supabase
      .channel(`ticket-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${id}` },
        (payload) => {
          setLiveTicket((prev) => (prev && prev.id === id ? { ...prev, ...(payload.new as Partial<TicketRow>) } : prev));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketProp?.id]);

  // In-app navigation: when something inside the sheet (parent badge, bug
  // link in a comment, ...) requests opening another ticket, swap the
  // live ticket without closing the sheet.
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || id === liveTicket?.id) return;
      fetchTicketById(id).then((t) => {
        if (t) setLiveTicket(t);
      });
    };
    window.addEventListener(OPEN_TICKET_EVENT, handler);
    return () => window.removeEventListener(OPEN_TICKET_EVENT, handler);
  }, [open, liveTicket?.id]);

  const ticket = liveTicket;

  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { statuses } = useStatuses();
  const [assignOpen, setAssignOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSlot, setRequestSlot] = useState<"FE" | "BE" | undefined>(undefined);
  const [logsReloadKey, setLogsReloadKey] = useState(0);
  const [logCount, setLogCount] = useState(0);
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
                ticketTitle={ticket.title}
                epicName={ticket.epic_name ?? null}
                role={role}
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
                onLocalPatch={(patch) =>
                  setLiveTicket((prev) => (prev ? { ...prev, ...patch } : prev))
                }
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
