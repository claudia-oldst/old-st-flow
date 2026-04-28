import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DisciplineStatus, Status } from "@/lib/types";
import { useStatuses } from "@/features/statuses/useStatuses";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Operator = "AND" | "OR";

interface Rule {
  id: string;
  position: number;
  fe_statuses: DisciplineStatus[];
  be_statuses: DisciplineStatus[];
  operator: Operator;
  status_id: string;
}

const DISC_OPTIONS: { value: DisciplineStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "for_integration", label: "For integration" },
  { value: "done", label: "Done" },
];

function ChipGroup({
  value,
  onChange,
  disabled,
}: {
  value: DisciplineStatus[];
  onChange: (v: DisciplineStatus[]) => void;
  disabled?: boolean;
}) {
  const toggle = (s: DisciplineStatus) => {
    if (disabled) return;
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {DISC_OPTIONS.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-full text-xs ring-1 transition ${
              active
                ? "bg-primary/15 text-primary ring-primary/40"
                : "bg-white/[0.02] text-dim ring-white/10 hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
      {value.length === 0 && (
        <span className="text-xs text-dimmer self-center pl-1">any</span>
      )}
    </div>
  );
}

function evaluateRule(
  rule: Pick<Rule, "fe_statuses" | "be_statuses" | "operator">,
  fe: DisciplineStatus,
  be: DisciplineStatus,
) {
  const feMatch = rule.fe_statuses.length === 0 || rule.fe_statuses.includes(fe);
  const beMatch = rule.be_statuses.length === 0 || rule.be_statuses.includes(be);
  return rule.operator === "AND" ? feMatch && beMatch : feMatch || beMatch;
}

export default function StatusRulesAdmin({ canEdit }: { canEdit: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { statuses } = useStatuses();

  const load = async () => {
    const { data, error } = await supabase
      .from("status_derivation_rules")
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setRules(((data as any) ?? []).map((r: any) => ({
      id: r.id,
      position: r.position,
      fe_statuses: r.fe_statuses ?? [],
      be_statuses: r.be_statuses ?? [],
      operator: r.operator,
      status_id: r.status_id,
    })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`status-rules-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "status_derivation_rules" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const sorted = useMemo(() => [...rules].sort((a, b) => a.position - b.position), [rules]);

  const reapply = async () => {
    const { error } = await supabase.rpc("reapply_status_rules");
    if (error) toast.error("Saved, but failed to re-apply: " + error.message);
  };

  const updateRule = async (id: string, patch: Partial<Rule>) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaving(true);
    const { error } = await supabase.from("status_derivation_rules").update(patch as any).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      load();
      return;
    }
    await reapply();
  };

  const addRule = async () => {
    if (!statuses.length) return toast.error("Add a status first");
    const nextPos = sorted.length ? Math.max(...sorted.map((r) => r.position)) + 1 : 1;
    const { data, error } = await supabase
      .from("status_derivation_rules")
      .insert({
        position: nextPos,
        fe_statuses: [],
        be_statuses: [],
        operator: "AND",
        status_id: statuses[0].id,
      } as any)
      .select()
      .single();
    if (error || !data) return toast.error(error?.message ?? "Failed to add rule");
    setRules((rs) => [
      ...rs,
      {
        id: (data as any).id,
        position: (data as any).position,
        fe_statuses: (data as any).fe_statuses ?? [],
        be_statuses: (data as any).be_statuses ?? [],
        operator: (data as any).operator,
        status_id: (data as any).status_id,
      },
    ]);
    toast.success("Rule added");
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("status_derivation_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    await reapply();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = sorted.findIndex((r) => r.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const me = sorted[idx];
    await supabase.from("status_derivation_rules").update({ position: swap.position }).eq("id", me.id);
    await supabase.from("status_derivation_rules").update({ position: me.position }).eq("id", swap.id);
    await reapply();
  };

  const resetDefaults = async () => {
    if (!confirm("Replace all rules with the default 3-rule set?")) return;
    const done = statuses.find((s) => s.category === "done");
    const active = statuses.find((s) => s.category === "active");
    const backlog = statuses.find((s) => s.category === "backlog");
    if (!done || !active || !backlog) return toast.error("Need at least one status in each category (Backlog, Active, Done)");

    await supabase.from("status_derivation_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("status_derivation_rules").insert([
      { position: 1, fe_statuses: ["done"], be_statuses: ["done"], operator: "AND", status_id: done.id },
      { position: 2, fe_statuses: ["in_progress", "done"], be_statuses: ["in_progress", "done"], operator: "OR", status_id: active.id },
      { position: 3, fe_statuses: ["todo"], be_statuses: ["todo"], operator: "AND", status_id: backlog.id },
    ] as any);
    if (error) return toast.error(error.message);
    toast.success("Defaults restored");
    await reapply();
  };

  const statusById = (id: string) => statuses.find((s) => s.id === id);

  // Preview matrix
  const matrix: { fe: DisciplineStatus; be: DisciplineStatus; status: Status | null }[][] =
    DISC_OPTIONS.map((feOpt) =>
      DISC_OPTIONS.map((beOpt) => {
        const winning = sorted.find((r) => evaluateRule(r, feOpt.value, beOpt.value));
        return {
          fe: feOpt.value,
          be: beOpt.value,
          status: winning ? statusById(winning.status_id) ?? null : null,
        };
      }),
    );

  if (loading) return <div className="text-dim text-sm">Loading rules…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="text-dim text-sm max-w-2xl">
          IF/THEN rules control how each ticket's <strong>Project status</strong> is derived from its FE
          and BE statuses. Rules are evaluated top-down; first match wins. A manual project-status
          change on a ticket is preserved only until the next FE or BE status change — then the
          rules engine takes over again.
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" className="gap-2" onClick={resetDefaults}>
              <RotateCcw className="h-4 w-4" /> Reset defaults
            </Button>
            <Button size="sm" className="gap-2" onClick={addRule}>
              <Plus className="h-4 w-4" /> Add rule
            </Button>
          </div>
        )}
      </div>

      {/* Rules list */}
      <div className="glass rounded-2xl overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-dim text-sm">
            No rules yet. {canEdit && "Click \"Add rule\" or \"Reset defaults\" to get started."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((rule, i) => {
              const status = statusById(rule.status_id);
              return (
                <div key={rule.id} className="px-4 py-4 hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs uppercase tracking-wider text-dimmer w-12">Rule {i + 1}</span>
                    <span className="text-xs text-dim">IF</span>
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-3 items-center">
                    <span className="text-xs text-dim font-medium">FE in</span>
                    <ChipGroup
                      value={rule.fe_statuses}
                      onChange={(v) => updateRule(rule.id, { fe_statuses: v })}
                      disabled={!canEdit}
                    />

                    <Select
                      value={rule.operator}
                      onValueChange={(v) => updateRule(rule.id, { operator: v as Operator })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-8 w-[78px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>

                    <ChipGroup
                      value={rule.be_statuses}
                      onChange={(v) => updateRule(rule.id, { be_statuses: v })}
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-dim font-medium pl-2">BE in</span>
                    <span /> {/* spacer */}
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-xs text-dim">THEN Project =</span>
                    <Select
                      value={rule.status_id}
                      onValueChange={(v) => updateRule(rule.id, { status_id: v })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-8 w-[220px] text-xs">
                        <SelectValue>
                          {status && (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                              {status.name}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                              {s.name}
                              <span className="text-dimmer text-xs capitalize ml-1">({s.category})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="ml-auto flex items-center gap-1">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="text-dimmer h-8 w-8" disabled={i === 0} onClick={() => move(rule.id, -1)}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-dimmer h-8 w-8" disabled={i === sorted.length - 1} onClick={() => move(rule.id, 1)}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-dimmer hover:text-destructive h-8 w-8" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview matrix */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-3">Preview matrix</div>
        <div className="glass rounded-2xl p-4 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="p-2 text-dimmer text-left font-normal">FE ↓ / BE →</th>
                {DISC_OPTIONS.map((be) => (
                  <th key={be.value} className="p-2 text-left text-dim font-medium">{be.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={DISC_OPTIONS[i].value}>
                  <td className="p-2 text-dim font-medium">{DISC_OPTIONS[i].label}</td>
                  {row.map((cell, j) => (
                    <td key={j} className="p-2">
                      {cell.status ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] ring-1 ring-white/5">
                          <span className="h-2 w-2 rounded-full" style={{ background: cell.status.color }} />
                          {cell.status.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/10 text-destructive ring-1 ring-destructive/30">
                          No rule
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-dimmer mt-3">
            Cells marked "No rule" mean tickets with that FE/BE combo will keep their existing project status.
          </div>
        </div>
      </div>

      {saving && <div className="text-xs text-dimmer">Saving…</div>}
    </div>
  );
}
