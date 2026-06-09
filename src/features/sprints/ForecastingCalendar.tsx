import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Sprint, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import {
  useSprintCapacities,
  useProjectMembers,
  usePlannedSprintAssignments,
} from "./useSprintBoard";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { SprintPoolingTable } from "./SprintPoolingTable";
import type { AssigneeSlot } from "@/lib/types";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

export function ForecastingCalendar({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const { data: members = [] } = useProjectMembers(projectId);
  const devMembers = useMemo(
    () => members.filter((m) => memberDisciplines(m.role).length > 0),
    [members],
  );

  const appendNext = async () => {
    const last = [...sprints].sort((a, b) => b.sprint_number - a.sprint_number)[0];
    const nextNumber = (last?.sprint_number ?? 0) + 1;
    const start = last ? addDays(parseISO(last.end_date), 1) : new Date();
    const end = addDays(start, 13);
    const { error } = await supabase.from("sprints").insert({
      project_id: projectId,
      sprint_number: nextNumber,
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", projectId] });
  };

  if (sprints.length === 0) {
    return (
      <div className="hairline rounded-md p-6 text-center space-y-3">
        <div className="text-sm text-dim">No sprints yet.</div>
        {isPMBA && (
          <Button onClick={appendNext} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create first sprint
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Sprint Blocks
          </h3>
          {isPMBA && (
            <Button onClick={appendNext} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> Append next sprint block
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {sprints.map((s) => (
            <SprintBlockCard
              key={s.id}
              sprint={s}
              devMembers={devMembers}
              projectId={projectId}
              isPMBA={isPMBA}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Ticket Pooling
        </h3>
        <SprintPoolingTable
          projectId={projectId}
          sprints={sprints}
          isPMBA={isPMBA}
        />
      </section>
    </div>
  );
}

function SprintBlockCard({
  sprint,
  devMembers,
  projectId,
  isPMBA,
}: {
  sprint: Sprint;
  devMembers: SprintMember[];
  projectId: string;
  isPMBA: boolean;
}) {
  const qc = useQueryClient();
  const { data: capacities = [] } = useSprintCapacities(sprint.id);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const { tickets } = useProjectTickets(projectId);

  const capFor = (uid: string, d: AssigneeSlot) =>
    Number(capacities.find((c) => c.user_id === uid && c.discipline === d)?.hours ?? 0);

  const addedUserIds = useMemo(() => {
    const set = new Set<string>();
    capacities.forEach((c) => set.add(c.user_id));
    return set;
  }, [capacities]);

  const addedMembers = useMemo(
    () => devMembers.filter((m) => addedUserIds.has(m.user_id)),
    [devMembers, addedUserIds],
  );
  const availableMembers = useMemo(
    () => devMembers.filter((m) => !addedUserIds.has(m.user_id)),
    [devMembers, addedUserIds],
  );

  // Pooled hours: sum estimates for tickets assigned FE/BE planned sprint = sprint.id
  const { pooledFE, pooledBE } = useMemo(() => {
    let fe = 0;
    let be = 0;
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    assignments.forEach((a) => {
      const t = ticketMap.get(a.ticket_id);
      if (!t) return;
      if (a.planned_sprint_fe_id === sprint.id) fe += t.current_fe_estimate || 0;
      if (a.planned_sprint_be_id === sprint.id) be += t.current_be_estimate || 0;
    });
    return { pooledFE: fe, pooledBE: be };
  }, [assignments, tickets, sprint.id]);

  const capFE = capacities.filter((c) => c.discipline === "FE").reduce((s, c) => s + Number(c.hours), 0);
  const capBE = capacities.filter((c) => c.discipline === "BE").reduce((s, c) => s + Number(c.hours), 0);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["sprint_capacities", sprint.id] });

  const updateCap = async (userId: string, discipline: AssigneeSlot, hours: number) => {
    const existing = capacities.find((c) => c.user_id === userId && c.discipline === discipline);
    if (existing) {
      const { error } = await supabase
        .from("sprint_capacities")
        .update({ hours })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("sprint_capacities").insert({
        sprint_id: sprint.id,
        user_id: userId,
        discipline,
        hours,
      });
      if (error) toast.error(error.message);
    }
    invalidate();
  };

  const addMember = async (m: SprintMember) => {
    const primary = memberDisciplines(m.role)[0] as AssigneeSlot;
    const { error } = await supabase.from("sprint_capacities").insert({
      sprint_id: sprint.id,
      user_id: m.user_id,
      discipline: primary,
      hours: 0,
    });
    if (error) toast.error(error.message);
    invalidate();
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase
      .from("sprint_capacities")
      .delete()
      .eq("sprint_id", sprint.id)
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    invalidate();
  };

  const updateDates = async (field: "start_date" | "end_date", val: string) => {
    const update = field === "start_date" ? { start_date: val } : { end_date: val };
    const { error } = await supabase.from("sprints").update(update).eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  const remove = async () => {
    if (!confirm(`Delete Sprint ${sprint.sprint_number}?`)) return;
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  return (
    <div className="hairline rounded-md p-3 bg-surface-1/40 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="font-mono text-xs px-2 py-0.5 rounded bg-white/5">
          Sprint {sprint.sprint_number}
        </div>
        <Input
          type="date"
          value={sprint.start_date}
          onChange={(e) => updateDates("start_date", e.target.value)}
          disabled={!isPMBA}
          className="h-7 text-xs w-32"
        />
        <span className="text-dim text-xs">→</span>
        <Input
          type="date"
          value={sprint.end_date}
          onChange={(e) => updateDates("end_date", e.target.value)}
          disabled={!isPMBA}
          className="h-7 text-xs w-32"
        />
        {isPMBA && (
          <Button variant="ghost" size="icon" onClick={remove} className="h-7 w-7 ml-auto">
            <Trash2 className="h-3.5 w-3.5 text-dim" />
          </Button>
        )}
      </div>

      {addedMembers.length > 0 ? (
        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-x-3 gap-y-1 text-xs items-center">
          <div className="text-[10px] uppercase tracking-wide text-dim">Member</div>
          <div className="text-[10px] uppercase tracking-wide text-dim text-right w-14">FE (h)</div>
          <div className="text-[10px] uppercase tracking-wide text-dim text-right w-14">BE (h)</div>
          <div className="w-6" />
          {addedMembers.map((m) => {
            const ds = memberDisciplines(m.role);
            return (
              <CapRow
                key={m.user_id}
                m={m}
                feVal={capFor(m.user_id, "FE")}
                beVal={capFor(m.user_id, "BE")}
                allowFE={ds.includes("FE")}
                allowBE={ds.includes("BE")}
                isPMBA={isPMBA}
                onChange={updateCap}
                onRemove={() => removeMember(m.user_id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-dim italic">No members added</div>
      )}

      {isPMBA && (
        <AddMemberPopover available={availableMembers} onPick={addMember} />
      )}

      <div className="hairline-t pt-2 mt-1 space-y-1.5">
        <UtilisationBar label="FE" pooled={pooledFE} capacity={capFE} />
        <UtilisationBar label="BE" pooled={pooledBE} capacity={capBE} />
      </div>
    </div>
  );
}

function UtilisationBar({
  label,
  pooled,
  capacity,
}: {
  label: string;
  pooled: number;
  capacity: number;
}) {
  const over = capacity > 0 && pooled > capacity;
  const pct = capacity > 0 ? Math.min(100, (pooled / capacity) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-dim uppercase tracking-wide">{label}</span>
        <span className={cn(over && "text-primary font-semibold")}>
          {pooled}h / {capacity}h
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", over ? "bg-primary" : "bg-accent/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AddMemberPopover({
  available,
  onPick,
}: {
  available: SprintMember[];
  onPick: (m: SprintMember) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-fit"
          disabled={available.length === 0}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Member
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput placeholder="Find member…" className="h-8" />
          <CommandList>
            <CommandEmpty>No members</CommandEmpty>
            <CommandGroup>
              {available.map((m) => (
                <CommandItem
                  key={m.user_id}
                  value={`${m.member.name} ${m.role}`}
                  onSelect={() => {
                    onPick(m);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{m.member.name}</span>
                  <span className="ml-auto text-[10px] text-dim">{m.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CapRow({
  m,
  feVal,
  beVal,
  allowFE,
  allowBE,
  isPMBA,
  onChange,
  onRemove,
}: {
  m: SprintMember;
  feVal: number;
  beVal: number;
  allowFE: boolean;
  allowBE: boolean;
  isPMBA: boolean;
  onChange: (uid: string, d: AssigneeSlot, h: number) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <div className="text-foreground truncate">
        {m.member.name}{" "}
        <span className="text-[10px] text-dim">· {m.role}</span>
      </div>
      <CapInput value={feVal} disabled={!isPMBA || !allowFE} onCommit={(v) => onChange(m.user_id, "FE", v)} />
      <CapInput value={beVal} disabled={!isPMBA || !allowBE} onCommit={(v) => onChange(m.user_id, "BE", v)} />
      {isPMBA ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-6 w-6"
          title="Remove from sprint"
        >
          <X className="h-3 w-3 text-dim" />
        </Button>
      ) : (
        <div className="w-6" />
      )}
    </>
  );
}

function CapInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useMemo(() => setLocal(String(value)), [value]);
  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isFinite(n) || n < 0) {
          setLocal(String(value));
          return;
        }
        if (n !== value) onCommit(n);
      }}
      className={cn("h-7 text-xs text-right w-14 font-mono", disabled && "opacity-50")}
    />
  );
}
