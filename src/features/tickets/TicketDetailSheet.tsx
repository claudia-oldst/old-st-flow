import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Users, Trash2, Edit3, Bookmark, Sparkles, Pin } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow | null;
  projectId: string;
  onChange: () => void;
}

interface LogEntry {
  id: string;
  hours: number;
  discipline: "FE" | "BE" | "Overhead";
  note: string | null;
  logged_at: string;
  source: "timer" | "manual";
  user: { name: string; avatar_color: string };
}

export function TicketDetailSheet({ open, onOpenChange, ticket, projectId, onChange }: Props) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { statuses } = useStatuses();
  const [assignOpen, setAssignOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [feEst, setFeEst] = useState("");
  const [beEst, setBeEst] = useState("");

  useEffect(() => {
    if (!ticket) return;
    setTitle(ticket.title);
    setFeEst(String(ticket.est_frontend_hours));
    setBeEst(String(ticket.est_backend_hours));
    setEditing(false);
    supabase
      .from("time_logs")
      .select("id,hours,discipline,note,logged_at,source,user:team_members(name,avatar_color)")
      .eq("ticket_id", ticket.id)
      .order("logged_at", { ascending: false })
      .then(({ data }) => setLogs((data as any) ?? []));
  }, [ticket]);

  if (!ticket) return null;

  const status = statuses.find((s) => s.id === ticket.status_id);
  const isMine = !!user && ticket.assignees.some((a) => a.user_id === user.id);
  const canLog = isMine || isPMBA(role);
  const myFE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "FE");
  const myBE = !!user && ticket.assignees.some((a) => a.user_id === user.id && a.slot === "BE");
  const canEditFE = isPMBA(role) || myFE;
  const canEditBE = isPMBA(role) || myBE;

  const updateDiscipline = async (slot: "FE" | "BE", value: DisciplineStatus) => {
    const col = slot === "FE" ? "fe_status" : "be_status";
    const { error } = await supabase.from("tickets").update({ [col]: value }).eq("id", ticket.id);
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
    const { error } = await supabase
      .from("tickets")
      .update({ title: title.trim(), est_frontend_hours: fe, est_backend_hours: be })
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    onChange();
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
                <span className="px-2 py-0.5 rounded-full text-[10px] ring-1 ring-white/10" style={{ background: `${status.color}22`, color: status.color }}>
                  {status.name}
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

            {/* Estimates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-dimmer">Estimates & actuals</div>
                {isPMBA(role) && !editing && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
                    <Edit3 className="h-3 w-3" /> Edit
                  </Button>
                )}
              </div>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">FE estimate (hrs)</Label>
                    <Input type="number" step="0.5" value={feEst} onChange={(e) => setFeEst(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BE estimate (hrs)</Label>
                    <Input type="number" step="0.5" value={beEst} onChange={(e) => setBeEst(e.target.value)} />
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Frontend" actual={ticket.actual_frontend_hours} estimate={ticket.est_frontend_hours} />
                  <Stat label="Backend" actual={ticket.actual_backend_hours} estimate={ticket.est_backend_hours} />
                </div>
              )}
              {ticket.actual_overhead_hours > 0 && (
                <div className="mt-3 text-xs text-dim">
                  Overhead logged: <span className="text-foreground font-mono">{formatHours(ticket.actual_overhead_hours)}</span>
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
              <AssigneeBlock label="Frontend" assignees={ticket.assignees.filter(a => a.slot === "FE")} />
              <AssigneeBlock label="Backend" assignees={ticket.assignees.filter(a => a.slot === "BE")} />
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
                {!canLog && role && (
                  <span className="text-[10px] text-dimmer">Assign yourself to log time</span>
                )}
              </div>
              {logs.length === 0 ? (
                <div className="text-sm text-dim p-4 rounded-lg bg-white/[0.02] hairline">
                  No time logged yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hairline text-sm">
                      <MemberAvatar name={l.user.name} color={l.user.avatar_color} size="xs" />
                      <span className="text-dim flex-1 truncate">
                        {l.user.name} · <span className="font-mono">{formatHours(l.hours)}</span> · {l.discipline}
                        {l.note && <span className="text-dimmer"> — {l.note}</span>}
                      </span>
                      <span className="text-[10px] text-dimmer">{new Date(l.logged_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
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
            // Refresh logs in panel
            supabase
              .from("time_logs")
              .select("id,hours,discipline,note,logged_at,source,user:team_members(name,avatar_color)")
              .eq("ticket_id", ticket.id)
              .order("logged_at", { ascending: false })
              .then(({ data }) => setLogs((data as any) ?? []));
          }}
        />
      )}
    </>
  );
}

function Stat({ label, actual, estimate }: { label: string; actual: number; estimate: number }) {
  const r = estimate > 0 ? actual / estimate : 0;
  const color = r >= 1 ? "text-health-bad" : r >= 0.8 ? "text-health-warn" : "text-health-good";
  return (
    <div className="rounded-lg bg-white/[0.02] hairline p-3">
      <div className="text-xs text-dimmer">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-lg font-mono font-semibold ${actual > 0 ? color : "text-foreground"}`}>{formatHours(actual)}</span>
        <span className="text-xs text-dimmer">/ {formatHours(estimate)}</span>
      </div>
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
