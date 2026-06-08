import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Sprint, SprintCapacity, SprintMember } from "./types";
import { memberDisciplines } from "./types";
import { useSprintCapacities, useProjectMembers } from "./useSprintBoard";
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Forecasting Calendar
        </h3>
        {isPMBA && (
          <Button onClick={appendNext} size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5 mr-1" /> Append next sprint block
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {sprints.map((s) => (
          <SprintRow
            key={s.id}
            sprint={s}
            devMembers={devMembers}
            isPMBA={isPMBA}
          />
        ))}
      </div>
    </div>
  );
}

function SprintRow({
  sprint,
  devMembers,
  isPMBA,
}: {
  sprint: Sprint;
  devMembers: SprintMember[];
  isPMBA: boolean;
}) {
  const qc = useQueryClient();
  const { data: capacities = [] } = useSprintCapacities(sprint.id);

  const capFor = (uid: string, d: AssigneeSlot) =>
    Number(capacities.find((c) => c.user_id === uid && c.discipline === d)?.hours ?? 0);

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
    qc.invalidateQueries({ queryKey: ["sprint_capacities", sprint.id] });
  };

  const updateDates = async (field: "start_date" | "end_date", val: string) => {
    const { error } = await supabase.from("sprints").update({ [field]: val }).eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  const remove = async () => {
    if (!confirm(`Delete Sprint ${sprint.sprint_number}?`)) return;
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  const totalCap = capacities.reduce((s, c) => s + Number(c.hours), 0);

  return (
    <div className="hairline rounded-md p-3 bg-surface-1/40">
      <div className="flex items-center gap-3 mb-2">
        <div className="font-mono text-xs px-2 py-0.5 rounded bg-white/5">
          Sprint {sprint.sprint_number}
        </div>
        <Input
          type="date"
          value={sprint.start_date}
          onChange={(e) => updateDates("start_date", e.target.value)}
          disabled={!isPMBA}
          className="h-7 text-xs w-36"
        />
        <span className="text-dim text-xs">→</span>
        <Input
          type="date"
          value={sprint.end_date}
          onChange={(e) => updateDates("end_date", e.target.value)}
          disabled={!isPMBA}
          className="h-7 text-xs w-36"
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[11px] text-dim">
            Total: <span className="text-foreground">{totalCap}h</span>
          </span>
          {isPMBA && (
            <Button variant="ghost" size="icon" onClick={remove} className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5 text-dim" />
            </Button>
          )}
        </div>
      </div>
      {devMembers.length > 0 && (
        <div className="grid grid-cols-[1fr,auto,auto] gap-x-3 gap-y-1 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-dim">Member</div>
          <div className="text-[10px] uppercase tracking-wide text-dim text-right w-16">FE (h)</div>
          <div className="text-[10px] uppercase tracking-wide text-dim text-right w-16">BE (h)</div>
          {devMembers.map((m) => {
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
              />
            );
          })}
        </div>
      )}
    </div>
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
}: {
  m: SprintMember;
  feVal: number;
  beVal: number;
  allowFE: boolean;
  allowBE: boolean;
  isPMBA: boolean;
  onChange: (uid: string, d: AssigneeSlot, h: number) => void;
}) {
  return (
    <>
      <div className="text-foreground truncate">
        {m.member.name}{" "}
        <span className="text-[10px] text-dim">· {m.role}</span>
      </div>
      <CapInput value={feVal} disabled={!isPMBA || !allowFE} onCommit={(v) => onChange(m.user_id, "FE", v)} />
      <CapInput value={beVal} disabled={!isPMBA || !allowBE} onCommit={(v) => onChange(m.user_id, "BE", v)} />
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
  // sync if external value changes
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
      className={cn("h-7 text-xs text-right w-16 font-mono", disabled && "opacity-50")}
    />
  );
}
