import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { displayTitle, formatHours } from "@/lib/utils";
import { AssignDialog } from "@/features/tickets/AssignDialog";
import { LogTimeModal } from "@/features/timelog/LogTimeModal";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { RequestMoreTimeDialog } from "@/features/tickets/RequestMoreTimeDialog";
import { useTicketEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { type DisciplineStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Trash2, Edit3, Bookmark, Sparkles, Pin, TrendingUp } from "lucide-react";
import { TicketComments } from "@/features/comments/TicketComments";
import { toast } from "sonner";
import { Stat } from "./detail/Stat";
import { DisciplineRow } from "./detail/DisciplineRow";
import { AssigneeBlock } from "./detail/AssigneeBlock";
import { AcceptanceCriteria } from "./detail/AcceptanceCriteria";
import { TimeLogsPanel } from "./detail/TimeLogsPanel";
import { EstimateChangesPanel } from "./detail/EstimateChangesPanel";

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
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [feEst, setFeEst] = useState("");
  const [beEst, setBeEst] = useState("");
  const [projEst, setProjEst] = useState("");
  const { changes: estimateChanges, reload: reloadChanges } =
    useTicketEstimateChanges(ticket?.id);

  useEffect(() => {
    if (!ticket) return;
    setTitle(ticket.title);
    setFeEst(String(ticket.current_fe_estimate));
    setBeEst(String(ticket.current_be_estimate));
    setProjEst(String(ticket.current_project_estimate));
    setEditing(false);
  }, [ticket]);

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

  const updateDiscipline = async (slot: "FE" | "BE", value: DisciplineStatus) => {
    const patch = slot === "FE" ? { fe_status: value } : { be_status: value };
    const { error } = await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const setProjectStatus = async (statusId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status_id: statusId })
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const resetProjectStatusToAuto = async () => {
    const { error } = await supabase
      .from("tickets")
      .update({ project_status_override: false, fe_status: ticket.fe_status })
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);
    toast.success("Project status set to auto");
    onChange();
  };

  const handleSaveEdit = async () => {
    const fe = parseFloat(feEst) || 0;
    const be = parseFloat(beEst) || 0;
    const pj = parseFloat(projEst) || 0;
    const prevFE = ticket.current_fe_estimate;
    const prevBE = ticket.current_be_estimate;
    const prevProj = ticket.current_project_estimate;

    const patch: any = { title: title.trim() };
    if (isProj) {
      patch.current_project_estimate = pj;
    } else {
      patch.current_fe_estimate = fe;
      patch.current_be_estimate = be;
    }
    const { error } = await supabase
      .from("tickets")
      .update(patch)
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);

    const audit: any[] = [];
    const baseAudit = (discipline: string, prev: number, next: number) => ({
      ticket_id: ticket.id,
      user_id: user?.id,
      discipline,
      previous_hours: prev,
      new_hours: next,
      reason: "PMBA edit",
      status: "approved",
      decided_by: user?.id,
      decided_at: new Date().toISOString(),
    });
    if (!isProj && fe !== prevFE) audit.push(baseAudit("FE", prevFE, fe));
    if (!isProj && be !== prevBE) audit.push(baseAudit("BE", prevBE, be));
    if (isProj && pj !== prevProj) audit.push(baseAudit("Project", prevProj, pj));
    if (audit.length && user?.id) {
      await supabase.from("ticket_estimate_changes").insert(audit);
    }

    toast.success("Saved");
    setEditing(false);
    onChange();
    reloadChanges();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this ticket and all its time logs?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (error) return toast.error(error.message);
    toast.success("Ticket deleted");
    onOpenChange(false);
    onChange();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="glass-strong w-full sm:max-w-xl flex flex-col overflow-hidden">
          <SheetHeader className="space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-dimmer">{ticket.formatted_id}</span>
              {status && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ring-1 ring-white/10" style={{ background: `${status.color}22`, color: status.color }}>
                  {status.name}
                  {!ticket.project_status_override && (
                    <Sparkles className="h-2.5 w-2.5 opacity-70" />
                  )}
                </span>
              )}
              {ticket.ticket_type !== "Standard" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline">{ticket.ticket_type}</span>
              )}
              {ticket.ticket_type === "CR" && ticket.cr_approval === "pending" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30">
                  Pending
                </span>
              )}
              {ticket.epic_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline">
                  <Bookmark className="h-2.5 w-2.5" /> {ticket.epic_name}
                </span>
              )}
              {ticket.version && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline font-mono">
                  {ticket.version}
                </span>
              )}
            </div>
            <SheetTitle className="text-left text-xl">
              {editing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl" />
              ) : (
                displayTitle(ticket.title, ticket.ticket_type)
              )}
            </SheetTitle>
          </SheetHeader>

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
                canEdit={isPMBA(role)}
                onSaved={onChange}
              />
            </TabsContent>

            <TabsContent value="detail" className="mt-4 space-y-6 flex-1 overflow-y-auto">
              {isPMBA(role) && (
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
                {isPMBA(role) ? (
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

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-dimmer">Status</div>

                {!isProj && (
                  <div className="rounded-xl hairline bg-white/[0.02] p-3 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-dimmer uppercase tracking-wider">
                      Discipline
                    </div>
                    <DisciplineRow
                      slot="FE"
                      value={ticket.fe_status}
                      canEdit={canEditFE}
                      hasAssignee={hasFE}
                      onAssign={isPMBA(role) ? () => setAssignOpen(true) : undefined}
                      onChange={(v) => updateDiscipline("FE", v)}
                    />
                    <DisciplineRow
                      slot="BE"
                      value={ticket.be_status}
                      canEdit={canEditBE}
                      hasAssignee={hasBE}
                      onAssign={isPMBA(role) ? () => setAssignOpen(true) : undefined}
                      onChange={(v) => updateDiscipline("BE", v)}
                    />
                  </div>
                )}

                <div className="rounded-xl hairline bg-white/[0.02] p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-dimmer uppercase tracking-wider">Project status</div>
                    {isProj ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-dim">
                        <Pin className="h-2.5 w-2.5" /> Manual
                      </span>
                    ) : ticket.project_status_override ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/80">
                        <Pin className="h-2.5 w-2.5" /> Manual override
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-dim">
                        <Sparkles className="h-2.5 w-2.5" /> Auto from FE/BE
                      </span>
                    )}
                  </div>
                  {isPMBA(role) ? (
                    <div className="flex items-center gap-2">
                      <Select value={ticket.status_id ?? undefined} onValueChange={setProjectStatus}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Pick a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="inline-flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                                {s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {ticket.project_status_override && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={resetProjectStatusToAuto}>
                          <Sparkles className="h-3 w-3" /> Auto
                        </Button>
                      )}
                    </div>
                  ) : status ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
                      {status.name}
                    </span>
                  ) : (
                    <span className="text-xs text-dimmer">—</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider text-dimmer">Estimates & actuals</div>
                  <div className="flex items-center gap-1">
                    {!editing && !isProj && (canEditFE || canEditBE) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (canEditFE && !canEditBE) setRequestSlot("FE");
                          else if (canEditBE && !canEditFE) setRequestSlot("BE");
                          else setRequestSlot(undefined);
                          setRequestOpen(true);
                        }}
                        className="gap-1 text-xs"
                      >
                        <TrendingUp className="h-3 w-3" /> Adjust estimate
                      </Button>
                    )}
                    {(isPMBA(role) || (isProj && canEditProj)) && !editing && (
                      <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
                        <Edit3 className="h-3 w-3" /> Edit
                      </Button>
                    )}
                  </div>
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
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
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
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                      </div>
                    </div>
                  )
                ) : isProj ? (
                  <Stat
                    label="Project"
                    actual={ticket.actual_project_hours}
                    estimate={ticket.current_project_estimate}
                    original={ticket.original_project_estimate}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Frontend"
                      actual={ticket.actual_frontend_hours}
                      estimate={ticket.current_fe_estimate}
                      original={ticket.original_fe_estimate}
                    />
                    <Stat
                      label="Backend"
                      actual={ticket.actual_backend_hours}
                      estimate={ticket.current_be_estimate}
                      original={ticket.original_be_estimate}
                    />
                  </div>
                )}
                {!isProj && ticket.actual_project_hours > 0 && (
                  <div className="mt-3 text-xs text-dim">
                    Project contributors logged: <span className="text-foreground font-mono">{formatHours(ticket.actual_project_hours)}</span>
                    {ticket.current_project_estimate > 0 && (
                      <> / <span className="text-foreground font-mono">{formatHours(ticket.current_project_estimate)}</span></>
                    )}
                  </div>
                )}

                <EstimateChangesPanel changes={estimateChanges as any} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider text-dimmer">Assignees</div>
                  {isPMBA(role) && (
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

              {isPMBA(role) && (
                <div className="pt-4 hairline-t">
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive gap-1.5">
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

      {isPMBA(role) && (
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
