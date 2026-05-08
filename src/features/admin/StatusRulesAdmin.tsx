import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStatuses } from "@/features/statuses/useStatuses";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RuleRow, type Rule } from "./status-rules/RuleRow";
import { StatusRulesPreviewMatrix } from "./status-rules/StatusRulesPreviewMatrix";

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
    setRules(((data ?? []) as Rule[]).map((r) => ({
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
    const { error } = await supabase.from("status_derivation_rules").update(patch).eq("id", id);
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
      })
      .select()
      .single();
    if (error || !data) return toast.error(error?.message ?? "Failed to add rule");
    const row = data as Rule;
    setRules((rs) => [
      ...rs,
      {
        id: row.id,
        position: row.position,
        fe_statuses: row.fe_statuses ?? [],
        be_statuses: row.be_statuses ?? [],
        operator: row.operator,
        status_id: row.status_id,
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
    const myPos = me.position;
    const swapPos = swap.position;
    setRules((rs) =>
      rs.map((r) =>
        r.id === me.id ? { ...r, position: swapPos } : r.id === swap.id ? { ...r, position: myPos } : r,
      ),
    );
    const [a, b] = await Promise.all([
      supabase.from("status_derivation_rules").update({ position: swapPos }).eq("id", me.id),
      supabase.from("status_derivation_rules").update({ position: myPos }).eq("id", swap.id),
    ]);
    if (a.error || b.error) {
      toast.error(a.error?.message ?? b.error?.message ?? "Reorder failed");
      load();
      return;
    }
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
    ]);
    if (error) return toast.error(error.message);
    toast.success("Defaults restored");
    await reapply();
  };

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
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={async () => {
                const ok = confirm(
                  "Re-evaluate all tickets now? This applies the current rules to every ticket that doesn't have a manual project-status override.",
                );
                if (!ok) return;
                setSaving(true);
                const { error } = await supabase.rpc("reapply_status_rules");
                setSaving(false);
                if (error) toast.error(error.message);
                else toast.success("Tickets re-evaluated");
              }}
            >
              <RefreshCw className="h-4 w-4" /> Re-evaluate now
            </Button>
            <Button size="sm" variant="ghost" className="gap-2" onClick={resetDefaults}>
              <RotateCcw className="h-4 w-4" /> Reset defaults
            </Button>
            <Button size="sm" className="gap-2" onClick={addRule}>
              <Plus className="h-4 w-4" /> Add rule
            </Button>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-dim text-sm">
            No rules yet. {canEdit && "Click \"Add rule\" or \"Reset defaults\" to get started."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((rule, i) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                index={i}
                total={sorted.length}
                canEdit={canEdit}
                statuses={statuses}
                onUpdate={(patch) => updateRule(rule.id, patch)}
                onMove={(dir) => move(rule.id, dir)}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
          </div>
        )}
      </div>

      <StatusRulesPreviewMatrix rules={sorted} statuses={statuses} />

      {saving && <div className="text-xs text-dimmer">Saving…</div>}
    </div>
  );
}
