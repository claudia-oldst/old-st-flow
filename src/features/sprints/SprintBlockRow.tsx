import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { MemberAvatar, MemberAvatarStack } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import {
  useSprintCapacities,
  usePlannedSprintAssignments,
} from "./useSprintBoard";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { CapacityIndicator } from "./CapacityIndicator";

interface Props {
  sprint: Sprint;
  devMembers: SprintMember[];
  projectId: string;
  isPMBA: boolean;
}

export function SprintBlockRow({ sprint, devMembers, projectId, isPMBA }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
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

  // Sprint-level pooled hours (across all devs) — same calc as old SprintBlockCard.
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

  // Per-dev pooled hours — NEW. For each (userId, discipline), sum estimates
  // for tickets whose planned_sprint_{disc}_id matches this sprint AND who
  // has an assignee row with slot=disc and user_id=userId.
  const pooledPerDev = useMemo(() => {
    const map = new Map<string, { FE: number; BE: number }>();
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    assignments.forEach((a) => {
      const t = ticketMap.get(a.ticket_id);
      if (!t) return;
      if (a.planned_sprint_fe_id === sprint.id) {
        const est = t.current_fe_estimate || 0;
        t.assignees
          .filter((x) => x.slot === "FE")
          .forEach((x) => {
            const cur = map.get(x.user_id) ?? { FE: 0, BE: 0 };
            cur.FE += est;
            map.set(x.user_id, cur);
          });
      }
      if (a.planned_sprint_be_id === sprint.id) {
        const est = t.current_be_estimate || 0;
        t.assignees
          .filter((x) => x.slot === "BE")
          .forEach((x) => {
            const cur = map.get(x.user_id) ?? { FE: 0, BE: 0 };
            cur.BE += est;
            map.set(x.user_id, cur);
          });
      }
    });
    return map;
  }, [assignments, tickets, sprint.id]);

  const capFE = capacities
    .filter((c) => c.discipline === "FE")
    .reduce((s, c) => s + Number(c.hours), 0);
  const capBE = capacities
    .filter((c) => c.discipline === "BE")
    .reduce((s, c) => s + Number(c.hours), 0);

  const stackMembers = useMemo(
    () =>
      addedMembers.map((m) => ({
        id: m.user_id,
        name: m.member.name,
        avatar_color: m.member.avatar_color,
      })),
    [addedMembers],
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["sprint_capacities", sprint.id] });

  const updateCap = async (userId: string, discipline: AssigneeSlot, hours: number) => {
    const existing = capacities.find(
      (c) => c.user_id === userId && c.discipline === discipline,
    );
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

  const remove = async () => {
    if (!confirm(`Delete Sprint ${sprint.sprint_number}?`)) return;
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  const today = new Date();
  const start = parseISO(sprint.start_date);
  const end = parseISO(sprint.end_date);
  const isActive = today >= start && today <= end;

  return (
    <div className="hairline rounded-md bg-surface-1/40">
      <div className="h-12 flex items-center gap-3 px-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-dim hover:text-foreground transition"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
        <div className="text-sm font-medium w-16 shrink-0">
          Sprint {sprint.sprint_number}
        </div>
        <div className="text-xs text-dim font-mono shrink-0">
          {format(start, "MMM d")} → {format(end, "MMM d")}
        </div>
        {isActive && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase tracking-wide">
            active
          </span>
        )}
        {stackMembers.length > 0 && (
          <MemberAvatarStack members={stackMembers} size="xs" max={4} />
        )}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {capFE > 0 && (
            <ThinCapBar label="FE" pooled={pooledFE} cap={capFE} />
          )}
          {capBE > 0 && (
            <ThinCapBar label="BE" pooled={pooledBE} cap={capBE} />
          )}
        </div>
        {isPMBA && (
          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            className="h-7 w-7"
            title="Delete sprint"
          >
            <Trash2 className="h-3.5 w-3.5 text-dim" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1">
          {addedMembers.length === 0 && (
            <div className="text-[11px] text-dim italic py-1">No members added</div>
          )}
          {addedMembers.map((m) => {
            const ds = memberDisciplines(m.role);
            const pooled = pooledPerDev.get(m.user_id) ?? { FE: 0, BE: 0 };
            return (
              <div
                key={m.user_id}
                className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0"
              >
                <MemberAvatar
                  size="xs"
                  name={m.member.name}
                  color={m.member.avatar_color}
                />
                <div className="text-xs flex-1 truncate">{m.member.name}</div>
                {ds.map((d) => (
                  <DevDisciplineCell
                    key={d}
                    discipline={d}
                    pooled={pooled[d]}
                    cap={capFor(m.user_id, d)}
                    isPMBA={isPMBA}
                    onCommit={(h) => updateCap(m.user_id, d, h)}
                  />
                ))}
                {isPMBA && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(m.user_id)}
                    className="h-6 w-6"
                    title="Remove from sprint"
                  >
                    <X className="h-3 w-3 text-dim" />
                  </Button>
                )}
              </div>
            );
          })}
          {isPMBA && (
            <div className="pt-2">
              <AddMemberInline available={availableMembers} onPick={addMember} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThinCapBar({
  label,
  pooled,
  cap,
}: {
  label: string;
  pooled: number;
  cap: number;
}) {
  const over = pooled > cap;
  const pct = cap > 0 ? Math.min(100, (pooled / cap) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] text-dimmer w-6">{label}</span>
      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", over ? "bg-primary" : "bg-accent/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-mono text-dimmer whitespace-nowrap",
          over && "text-primary font-semibold",
        )}
      >
        {formatHours(pooled)}/{formatHours(cap)}h
      </span>
    </div>
  );
}

function DevDisciplineCell({
  discipline,
  pooled,
  cap,
  isPMBA,
  onCommit,
}: {
  discipline: AssigneeSlot;
  pooled: number;
  cap: number;
  isPMBA: boolean;
  onCommit: (hours: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-dim">
        {discipline}
      </span>
      <div className="w-32">
        <CapacityIndicator used={pooled} cap={cap} />
      </div>
      {isPMBA && (
        <CapInput value={cap} onCommit={onCommit} />
      )}
    </div>
  );
}

function CapInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => {
    setLocal(String(value));
  }, [value]);
  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isFinite(n) || n < 0) {
          setLocal(String(value));
          return;
        }
        if (n !== value) onCommit(n);
      }}
      className="h-6 w-16 text-xs text-right font-mono"
    />
  );
}

function AddMemberInline({
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
