import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { useTimerStore } from "@/store/timer";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn } from "@/lib/utils";
import { useStartGroup } from "./start-group/useStartGroup";
import { StartGroupFilters } from "./start-group/StartGroupFilters";
import { StartGroupTicketsList } from "./start-group/StartGroupTicketsList";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketRow[];
  role: ProjectRole | null;
}

export function StartGroupTimerDialog({ open, onOpenChange, tickets, role }: Props) {
  const activeTimer = useTimerStore((s) => s.active);
  const {
    discipline,
    onDisciplineChange,
    disciplineOptions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    selected,
    toggleSelect,
    toggleAllVisible,
    allVisibleSelected,
    visible,
    busy,
    handleStart,
  } = useStartGroup({
    open,
    tickets,
    role,
    onClose: () => onOpenChange(false),
  });

  const disciplineLabel: Record<LogDiscipline, string> = {
    FE: "Frontend",
    BE: "Backend",
    Project: "Project",
  };

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
                  onClick={() => onDisciplineChange(d.value)}
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
            Logging to <span className="text-foreground font-medium">{disciplineLabel[discipline]}</span> hours.
          </div>
        )}

        <StartGroupFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />

        <StartGroupTicketsList
          visible={visible}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleAllVisible={toggleAllVisible}
          allVisibleSelected={allVisibleSelected}
        />

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
