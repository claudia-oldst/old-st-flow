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
    ticket.acceptance_criteria && ticket.acceptance_criteria.trim() ? "acceptance" : "status";

  const feAssignees = ticket.assignees.filter((a) => a.slot === "FE");
  const beAssignees = ticket.assignees.filter((a) => a.slot === "BE");
  const totalActual =
    ticket.actual_frontend_hours + ticket.actual_backend_hours + ticket.actual_project_hours;
  const totalEst =
    ticket.current_fe_estimate + ticket.current_be_estimate + ticket.current_project_estimate;
  const burnPct = totalEst > 0 ? (totalActual / totalEst) * 100 : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="glass-strong w-full sm:max-w-3xl flex flex-col overflow-hidden">
          <TicketDetailHeader
            ticket={ticket}
            status={status}
            editing={editor.editing}
            title={editor.title}
            setTitle={editor.setTitle}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            {feAssignees.map((a) => (
              <div key={`fe-${a.user_id}`} className="flex items-center gap-1.5">
                <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
                <span className="text-dim">{a.member.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-dimmer">FE</span>
              </div>
            ))}
            {beAssignees.map((a) => (
              <div key={`be-${a.user_id}`} className="flex items-center gap-1.5">
                <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
                <span className="text-dim">{a.member.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-dimmer">BE</span>
              </div>
            ))}

            {totalEst > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative h-1.5 w-32 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      burnPct > 100 ? "bg-health-bad" : burnPct > 80 ? "bg-health-warn" : "bg-health-good",
                    )}
                    style={{ width: `${Math.min(100, burnPct)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    burnPct > 100 ? "text-health-bad" : burnPct > 80 ? "text-health-warn" : "text-dim",
                  )}
                >
                  {formatHours(totalActual)} / {formatHours(totalEst)}
                </span>
              </div>
            )}

            <span className={cn("text-dimmer text-[11px]", totalEst > 0 ? "" : "ml-auto")}>
              {logCount} time log{logCount === 1 ? "" : "s"}
            </span>
          </div>

          <Tabs defaultValue={defaultTab} className="mt-4 flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="acceptance">Acceptance</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="mt-4 space-y-6 flex-1 overflow-y-auto">
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
                onLogCount={setLogCount}
              />
            </TabsContent>

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
