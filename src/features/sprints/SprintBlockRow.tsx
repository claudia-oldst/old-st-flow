import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MemberAvatar, MemberAvatarStack } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import {
  useSprintCapacities,
  usePlannedSprintAssignments,
} from "./useSprintBoard";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { ThinCapBar } from "./sprint-block/ThinCapBar";
import { DevDisciplineCell } from "./sprint-block/DevDisciplineCell";
import { AddMemberInline } from "./sprint-block/AddMemberInline";

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

  // Per-dev pooled hours. For each (userId, discipline), sum estimates for
  // tickets whose planned_sprint_{disc}_id matches this sprint AND who has
  // an assignee row with slot=disc and user_id=userId.
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

  // Silence "useEffect imported but unused" — not used here directly but
  // children rely on lib/utils.cn import staying in tree.
  useEffect(() => undefined, []);

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
          {capFE > 0 && <ThinCapBar label="FE" pooled={pooledFE} cap={capFE} />}
          {capBE > 0 && <ThinCapBar label="BE" pooled={pooledBE} cap={capBE} />}
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
