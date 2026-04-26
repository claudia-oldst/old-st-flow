import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Square, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { toast } from "sonner";
import { cn, displayTitle } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow;
  role: ProjectRole | null;
  onLogged?: () => void;
}

export function LogTimeModal({ open, onOpenChange, ticket, role, onLogged }: Props) {
  const user = useCurrentUser((s) => s.user);
  const activeTimer = useTimerStore((s) => s.active);

  const isProjTicket = ticket.ticket_type === "Proj";

  // Determine which discipline buckets the user can log to
  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";
  // True if the user is on this ticket *only* via the "Other" slot —
  // their work counts as project Overhead regardless of role.
  const mySlotsOnTicket = user
    ? ticket.assignees.filter((a) => a.user_id === user.id).map((a) => a.slot)
    : [];
  const onlyOtherSlot = !isProjTicket && mySlotsOnTicket.length > 0 && mySlotsOnTicket.every((s) => s === "Other");
  const isOverhead = !isProjTicket && (role === "QA" || role === "PMBA" || role === "Design" || onlyOtherSlot);

  // Default discipline based on ticket type, role + assignment
  const defaultDiscipline: LogDiscipline = (() => {
    if (isProjTicket) return "Project";
    if (isOverhead) return "Overhead";
    if (role === "Frontend") return "FE";
    if (role === "Backend") return "BE";
    // Fullstack — prefer slot they are assigned to
    if (mySlotsOnTicket.includes("FE") && !mySlotsOnTicket.includes("BE")) return "FE";
    if (mySlotsOnTicket.includes("BE") && !mySlotsOnTicket.includes("FE")) return "BE";
    return "FE";
  })();

  const [discipline, setDiscipline] = useState<LogDiscipline>(defaultDiscipline);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isMyTimerOnThisTicket = activeTimer?.ticket_id === ticket.id;

  const handleStartTimer = async () => {
    if (!user) return toast.error("Pick a user first");
    setBusy(true);
    // Upsert the primary timer (one running timer per user).
    const { error } = await supabase.from("active_timers").upsert(
      { user_id: user.id, ticket_id: ticket.id, discipline, started_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    // Reset group ticket rows to a single entry for this ticket so the
    // Stop dialog (which iterates active_timer_tickets) sees the right ticket.
    await supabase.from("active_timer_tickets").delete().eq("user_id", user.id);
    const { error: gErr } = await supabase
      .from("active_timer_tickets")
      .insert({ user_id: user.id, ticket_id: ticket.id, position: 0 });
    setBusy(false);
    if (gErr) return toast.error(gErr.message);
    toast.success("Timer started");
    // Auto-prompt to move to active if backlog
    await maybePromoteToActive();
    onOpenChange(false);
  };

  const maybePromoteToActive = async () => {
    const { data: status } = await supabase
      .from("statuses")
      .select("*")
      .eq("id", ticket.status_id!)
      .maybeSingle();
    if (status?.category === "backlog") {
      const { data: nextActive } = await supabase
        .from("statuses")
        .select("*")
        .eq("category", "active")
        .order("position")
        .limit(1)
        .maybeSingle();
      if (nextActive) {
        await supabase.from("tickets").update({ status_id: nextActive.id }).eq("id", ticket.id);
        toast.info(`Moved to ${nextActive.name}`);
      }
    }
  };

  const handleManualLog = async () => {
    if (!user) return toast.error("Pick a user first");
    const h = parseFloat(hours);
    if (!h || h <= 0) return toast.error("Enter hours > 0");
    setBusy(true);
    const { error } = await supabase.from("time_logs").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      discipline,
      hours: h,
      note: note || null,
      source: "manual",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Logged ${h}h`);
    setHours("");
    setNote("");
    await maybePromoteToActive();
    onLogged?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Log time
          </DialogTitle>
          <div className="text-xs text-dim mt-1">
            <span className="font-mono">{ticket.formatted_id}</span> · {displayTitle(ticket.title, ticket.ticket_type)}
          </div>
        </DialogHeader>

        {isProjTicket ? (
          <div className="text-xs text-dim">
            Logging to the shared <span className="text-foreground font-medium">Project</span> estimate.
          </div>
        ) : !isOverhead && role === "Fullstack" ? (
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
            {(["FE", "BE"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiscipline(d)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition",
                  discipline === d ? "bg-foreground text-background" : "text-dim hover:text-foreground"
                )}
              >
                {d === "FE" ? "Frontend" : "Backend"}
              </button>
            ))}
          </div>
        ) : !isOverhead && role !== "Fullstack" ? (
          <div className="text-xs text-dim">
            Logging to <span className="text-foreground font-medium">{discipline === "FE" ? "Frontend" : "Backend"}</span> hours.
          </div>
        ) : (
          <div className="text-xs text-dim">
            Logging to project <span className="text-foreground font-medium">overhead</span> hours.
          </div>
        )}

        <Tabs defaultValue="timer" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timer">Live timer</TabsTrigger>
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-4 pt-4">
            {isMyTimerOnThisTicket ? (
              <div className="text-sm text-dim p-4 rounded-lg bg-white/5 hairline">
                A timer for this ticket is already running. Click the chip in the top bar to stop and log.
              </div>
            ) : activeTimer ? (
              <div className="text-sm text-amber-300 p-4 rounded-lg bg-amber-500/10 hairline">
                You have a timer running on another ticket. Starting a new one will replace it (the previous one will be discarded).
              </div>
            ) : (
              <div className="text-sm text-dim p-4 rounded-lg bg-white/5 hairline">
                Click start. The timer keeps running across pages — stop it from the top bar to commit hours.
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleStartTimer} disabled={busy || isMyTimerOnThisTicket} className="gap-2">
                <Play className="h-4 w-4" /> Start timer
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Note <span className="text-dimmer">(optional)</span></Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What did you work on?" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleManualLog} disabled={busy}>Log hours</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { Square };
