import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Search, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import { toast } from "sonner";
import { cn, displayTitle } from "@/lib/utils";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketRow[];
  role: ProjectRole | null;
}

type StatusFilter = "open" | "todo" | "in_progress";
type TypeFilter = "all" | "Standard" | "Bug" | "CR" | "Proj";

export function StartGroupTimerDialog({ open, onOpenChange, tickets, role }: Props) {
  const user = useCurrentUser((s) => s.user);
  const activeTimer = useTimerStore((s) => s.active);

  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";

  // Detect whether the user is assigned via the Project slot on any ticket
  // (any ticket type) — if so, they can log to the shared "Project" discipline.
  const hasProjectAssignments = useMemo(() => {
    if (!user) return false;
    return tickets.some((t) =>
      t.assignees.some((a) => a.user_id === user.id && a.slot === "Project")
    );
  }, [tickets, user]);

  // Users with no FE/BE capability default to Project.
  const defaultDiscipline: LogDiscipline = canFE
    ? "FE"
    : canBE
    ? "BE"
    : "Project";

  const [discipline, setDiscipline] = useState<LogDiscipline>(defaultDiscipline);

  // Re-seed when role resolves (project_members lookup is async) or user/dialog changes
  useEffect(() => {
    setDiscipline(defaultDiscipline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id, open]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Filter tickets to those assigned to current user, in correct slot for chosen discipline
  const myTickets = useMemo(() => {
    if (!user) return [];
    return tickets.filter((t) => {
      const myAssignments = t.assignees.filter((a) => a.user_id === user.id);
      if (myAssignments.length === 0) return false;
      if (discipline === "Project") {
        return myAssignments.some((a) => a.slot === "Project");
      }
      // FE / BE — only Standard/Bug/CR tickets, must be in matching slot
      if (t.ticket_type === "Proj") return false;
      return myAssignments.some((a) => a.slot === discipline);
    });
  }, [tickets, user, discipline]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myTickets.filter((t) => {
      // Status filter (per-discipline status when FE/BE; project status otherwise)
      const dStatus =
        discipline === "FE" ? t.fe_status : discipline === "BE" ? t.be_status : null;
      if (statusFilter === "open") {
        if (dStatus === "done") return false;
      } else if (statusFilter === "todo") {
        if (dStatus !== "todo") return false;
      } else if (statusFilter === "in_progress") {
        if (dStatus !== "in_progress") return false;
      }
      if (typeFilter !== "all" && t.ticket_type !== typeFilter) return false;
      if (q) {
        const hay = `${t.formatted_id} ${t.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [myTickets, search, statusFilter, typeFilter, discipline]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((t) => selected.has(t.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((t) => next.delete(t.id));
      } else {
        visible.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const handleStart = async () => {
    if (!user) return toast.error("Pick a user first");
    if (selected.size === 0) return toast.error("Select at least one ticket");

    // Preserve order of `visible` (then any other selected) for the remainder rule
    const orderedSelected: string[] = [];
    visible.forEach((t) => selected.has(t.id) && orderedSelected.push(t.id));
    selected.forEach((id) => {
      if (!orderedSelected.includes(id)) orderedSelected.push(id);
    });

    setBusy(true);

    // Replace any running timer for this user
    await supabase.from("active_timer_tickets").delete().eq("user_id", user.id);
    const { error: tErr } = await supabase.from("active_timers").upsert(
      {
        user_id: user.id,
        ticket_id: orderedSelected[0],
        discipline,
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (tErr) {
      setBusy(false);
      return toast.error(tErr.message);
    }

    const groupRows = orderedSelected.map((ticket_id, position) => ({
      user_id: user.id,
      ticket_id,
      position,
    }));
    const { error: gErr } = await supabase
      .from("active_timer_tickets")
      .insert(groupRows);
    setBusy(false);
    if (gErr) return toast.error(gErr.message);

    toast.success(
      `Timer started on ${orderedSelected.length} ticket${orderedSelected.length === 1 ? "" : "s"}`
    );
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const disciplineLabel =
    discipline === "FE"
      ? "Frontend"
      : discipline === "BE"
      ? "Backend"
      : "Project";

  // Build the discipline picker options based on role + assignments.
  const disciplineOptions: { value: LogDiscipline; label: string }[] = [];
  if (role === "Fullstack") {
    disciplineOptions.push({ value: "FE", label: "Frontend" }, { value: "BE", label: "Backend" });
  } else if (role === "Frontend") {
    disciplineOptions.push({ value: "FE", label: "Frontend" });
  } else if (role === "Backend") {
    disciplineOptions.push({ value: "BE", label: "Backend" });
  }
  if (hasProjectAssignments) disciplineOptions.push({ value: "Project", label: "Project" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Start group timer
          </DialogTitle>
        </DialogHeader>

        {activeTimer && (
          <div className="text-sm text-amber-300 p-3 rounded-lg bg-amber-500/10 hairline">
            You already have a timer running. Starting a new one will replace it.
          </div>
        )}

        {/* Discipline */}
        {disciplineOptions.length === 0 ? (
          <div className="text-xs text-dim">
            You have no ticket assignments to log time against.
          </div>
        ) : disciplineOptions.length > 1 ? (
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wider text-dimmer">Discipline</div>
            <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
              {disciplineOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => {
                    setDiscipline(d.value);
                    setSelected(new Set());
                  }}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md transition",
                    discipline === d.value
                      ? "bg-foreground text-background"
                      : "text-dim hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-dim">
            Logging to <span className="text-foreground font-medium">{disciplineLabel}</span> hours.
          </div>
        )}

        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID or title…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-0.5 rounded-md bg-white/5 hairline">
              {(
                [
                  ["open", "Open"],
                  ["todo", "To-do"],
                  ["in_progress", "In progress"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setStatusFilter(k)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded transition",
                    statusFilter === k
                      ? "bg-foreground text-background"
                      : "text-dim hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-0.5 rounded-md bg-white/5 hairline">
              {(["all", "Standard", "Bug", "CR", "Proj"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTypeFilter(k)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded transition",
                    typeFilter === k
                      ? "bg-foreground text-background"
                      : "text-dim hover:text-foreground"
                  )}
                >
                  {k === "all" ? "All" : k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg hairline overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] text-[11px] text-dim">
            <span>
              {selected.size} selected · {visible.length} shown
            </span>
            <button
              onClick={toggleAllVisible}
              disabled={visible.length === 0}
              className="text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {allVisibleSelected ? "Clear visible" : "Select all visible"}
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
            {visible.length === 0 ? (
              <div className="p-6 text-center text-sm text-dim">
                No assigned tickets match. Try changing the discipline or filters.
              </div>
            ) : (
              visible.map((t) => {
                const checked = selected.has(t.id);
                return (
                  <label
                    key={t.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer transition",
                      checked ? "bg-accent/10" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSelect(t.id)}
                    />
                    <span className="font-mono text-[11px] text-dimmer w-16 shrink-0">
                      {t.formatted_id}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {displayTitle(t.title, t.ticket_type)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={busy || selected.size === 0} className="gap-2">
            <Play className="h-4 w-4" /> Start timer ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
