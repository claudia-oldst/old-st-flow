import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { MemberAvatar } from "@/components/MemberAvatar";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { RequestMoreTimeDialog } from "@/features/tickets/RequestMoreTimeDialog";
import { useTicketEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { useTicketTimeLogs } from "@/features/timelog/useTicketTimeLogs";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Users, Trash2, Edit3, Bookmark, Sparkles, Pin, TrendingUp, History, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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
  const [showAllChanges, setShowAllChanges] = useState(false);
  const { logs, reload: reloadLogs } = useTicketTimeLogs(ticket?.id);
  const [logPage, setLogPage] = useState(0);
  const LOGS_PER_PAGE = 10;
  useEffect(() => { setLogPage(0); }, [ticket?.id, logs.length]);
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
    setShowAllChanges(false);
  }, [ticket]);

  if (!ticket) return null;

  const isProj = ticket.ticket_type === "Proj";
  const status = statuses.find((s) => s.id === ticket.status_id);
  const isMine = !!user && ticket.assignees.some((a) => a.user_id === user.id);
  // Time logging is restricted to users assigned to the ticket (any slot).
  // PMBA does not bypass — they must be assigned to log time.
  const canLog = isMine;
  const myFE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "FE");
  const myBE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "BE");
  // A discipline only "exists" on a ticket once someone is assigned for that role.
  const hasFE = !isProj && ticket.assignees.some((a) => a.slot === "FE");
  const hasBE = !isProj && ticket.assignees.some((a) => a.slot === "BE");
  const canEditFE = hasFE && (isPMBA(role) || myFE);
  const canEditBE = hasBE && (isPMBA(role) || myBE);
  // Proj tickets: anyone assigned (or PMBA) can edit the shared estimate.
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
    // Clearing the override re-runs the derive trigger on next fe/be touch.
    // We force a re-derive by toggling override off and writing the same fe_status.
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

    // Log changes for any discipline that actually moved.
    const audit: any[] = [];
    if (!isProj && fe !== prevFE) {
      audit.push({
        ticket_id: ticket.id,
        user_id: user?.id,
        discipline: "FE",
        previous_hours: prevFE,
        new_hours: fe,
        reason: "PMBA edit",
        status: "approved",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      });
    }
    if (!isProj && be !== prevBE) {
      audit.push({
        ticket_id: ticket.id,
        user_id: user?.id,
        discipline: "BE",
        previous_hours: prevBE,
        new_hours: be,
        reason: "PMBA edit",
        status: "approved",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      });
    }
    if (isProj && pj !== prevProj) {
      audit.push({
        ticket_id: ticket.id,
        user_id: user?.id,
        discipline: "Project",
        previous_hours: prevProj,
        new_hours: pj,
        reason: "PMBA edit",
        status: "approved",
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      });
    }
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
        <SheetContent className="glass-strong w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-2">
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

          <div className="mt-6 space-y-6">
            {/* Epic */}
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

            {/* Version */}
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

            {/* Status */}
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

            {/* Estimates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-dimmer">Estimates & actuals</div>
                <div className="flex items-center gap-1">
                  {!editing && !isProj && (canEditFE || canEditBE) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Default to user's slot if they only have one
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

              {/* Estimate change history */}
              {estimateChanges.length > 0 && (
                <div className="mt-4 rounded-lg bg-white/[0.02] hairline p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] text-dimmer uppercase tracking-wider inline-flex items-center gap-1.5">
                      <History className="h-3 w-3" /> Estimate changes ({estimateChanges.length})
                    </div>
                    {estimateChanges.length > 3 && (
                      <button
                        onClick={() => setShowAllChanges((v) => !v)}
                        className="text-[10px] text-dim hover:text-foreground transition"
                      >
                        {showAllChanges ? "Show less" : "View all"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(showAllChanges ? estimateChanges : estimateChanges.slice(0, 3)).map((c) => {
                      const sign = c.delta > 0 ? "+" : "";
                      const color =
                        c.delta > 0
                          ? "text-health-warn"
                          : c.delta < 0
                          ? "text-health-good"
                          : "text-dim";
                      const isAuto = (c.reason ?? "").startsWith("Auto-trimmed");
                      return (
                        <div key={c.id} className="flex items-start gap-2 text-xs">
                          <span className={`font-mono font-semibold ${color} w-12 shrink-0`}>
                            {sign}{formatHours(c.delta)}
                          </span>
                          <span className="text-dim shrink-0">{c.discipline}</span>
                          <span className="flex-1 min-w-0 text-dim truncate">
                            {isAuto ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded ring-1 ring-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-dimmer mr-1">
                                auto
                              </span>
                            ) : null}
                            {c.user?.name ?? "—"}
                            {c.reason && <span className="text-dimmer"> — {c.reason}</span>}
                          </span>
                          <span className="text-[10px] text-dimmer shrink-0">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Assignees */}
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

            {/* Time logs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-dimmer">Time logs ({logs.length})</div>
                {canLog && (
                  <Button size="sm" onClick={() => setLogOpen(true)} className="gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Log time
                  </Button>
                )}
                {!canLog && (
                  <span className="text-[10px] text-dimmer">Assign yourself to log time</span>
                )}
              </div>
              {logs.length === 0 ? (
                <div className="text-sm text-dim p-4 rounded-lg bg-white/[0.02] hairline">
                  No time logged yet.
                </div>
              ) : (
                (() => {
                  const totalPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
                  const page = Math.min(logPage, totalPages - 1);
                  const start = page * LOGS_PER_PAGE;
                  const visible = logs.slice(start, start + LOGS_PER_PAGE);
                  return (
                    <div className="space-y-1.5">
                      {visible.map((l) => (
                        <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hairline text-sm">
                          <MemberAvatar name={l.user.name} color={l.user.avatar_color} size="xs" />
                          <span className="text-dim flex-1 truncate">
                            {l.user.name} · <span className="font-mono">{formatHours(l.hours)}</span> · {l.discipline}
                            {l.note && <span className="text-dimmer"> — {l.note}</span>}
                          </span>
                          <span className="text-[10px] text-dimmer">{new Date(l.logged_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-dimmer">
                            {start + 1}–{Math.min(start + LOGS_PER_PAGE, logs.length)} of {logs.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={page === 0}
                              onClick={() => setLogPage(page - 1)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-[11px] text-dim font-mono px-1">
                              {page + 1} / {totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={page >= totalPages - 1}
                              onClick={() => setLogPage(page + 1)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {isPMBA(role) && (
              <div className="pt-4 hairline-t">
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Delete ticket
                </Button>
              </div>
            )}
          </div>
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
            reloadLogs();
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

function Stat({
  label,
  actual,
  estimate,
  original,
}: {
  label: string;
  actual: number;
  estimate: number;
  original: number;
}) {
  const r = estimate > 0 ? actual / estimate : 0;
  const color = r >= 1 ? "text-health-bad" : r >= 0.8 ? "text-health-warn" : "text-health-good";
  const changed = estimate !== original;
  const delta = estimate - original;
  return (
    <div className="rounded-lg bg-white/[0.02] hairline p-3">
      <div className="text-xs text-dimmer">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-lg font-mono font-semibold ${actual > 0 ? color : "text-foreground"}`}>{formatHours(actual)}</span>
        <span className="text-xs text-dimmer">/ {formatHours(estimate)}</span>
      </div>
      {changed && (
        <div className="mt-1 text-[10px] text-dimmer">
          Originally {formatHours(original)}{" "}
          <span className={delta > 0 ? "text-health-warn" : "text-health-good"}>
            ({delta > 0 ? "+" : ""}{formatHours(delta)})
          </span>
        </div>
      )}
    </div>
  );
}

const DISCIPLINE_OPTIONS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

function DisciplineRow({
  slot,
  value,
  canEdit,
  hasAssignee,
  onAssign,
  onChange,
}: {
  slot: "FE" | "BE";
  value: DisciplineStatus;
  canEdit: boolean;
  hasAssignee: boolean;
  onAssign?: () => void;
  onChange: (v: DisciplineStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-xs font-semibold text-dim">{slot}</div>
      {!hasAssignee ? (
        <div className="flex-1 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-white/[0.02] hairline">
          <span className="text-[11px] text-dimmer">
            No {slot === "FE" ? "frontend" : "backend"} assignee — status not applicable
          </span>
          {onAssign && (
            <button
              type="button"
              onClick={onAssign}
              className="text-[11px] text-dim hover:text-foreground transition underline-offset-2 hover:underline"
            >
              Assign
            </button>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 hairline flex-1">
          {DISCIPLINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 px-2 py-1 text-[11px] rounded-md transition ${
                value === opt
                  ? "bg-foreground text-background"
                  : "text-dim hover:text-foreground"
              }`}
            >
              {DISCIPLINE_STATUS_LABEL[opt]}
            </button>
          ))}
        </div>
      ) : (
        <DisciplineStatusChip slot={slot} status={value} size="sm" />
      )}
    </div>
  );
}

function AssigneeBlock({ label, assignees }: { label: string; assignees: TicketRow["assignees"] }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-16 text-xs text-dimmer">{label}</div>
      {assignees.length === 0 ? (
        <span className="text-xs text-dimmer">—</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {assignees.map((a) => (
            <div key={a.user_id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hairline text-xs">
              <MemberAvatar name={a.member.name} color={a.member.avatar_color} size="xs" />
              {a.member.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
