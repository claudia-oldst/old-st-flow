import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatHours } from "@/lib/utils";
import { useEpicDiscounts } from "./useEpicDiscounts";
import type { Epic } from "@/features/epics/useProjectEpics";

interface Props {
  projectId: string;
  epics: Epic[];
  canManage: boolean;
}

const disciplineLabel: Record<string, string> = {
  FE: "Frontend",
  BE: "Backend",
  Project: "Project",
};

export function DiscountsList({ projectId, epics, canManage }: Props) {
  const { discounts, update, remove, busy } = useEpicDiscounts(projectId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editReason, setEditReason] = useState("");

  const epicName = (id: number) =>
    epics.find((e) => e.id === id)?.epic_name ?? `Epic ${id}`;

  if (discounts.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-dim text-center">
        No discounts yet.
      </div>
    );
  }

  const startEdit = (id: string, hours: number, reason: string) => {
    setEditingId(id);
    setEditHours(String(hours));
    setEditReason(reason);
  };
  const saveEdit = async (id: string) => {
    const h = parseFloat(editHours);
    if (!isFinite(h) || h <= 0) return;
    await update({ id, patch: { hours: h, reason: editReason.trim() } });
    setEditingId(null);
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
        <div className="flex-1">Epic</div>
        <div className="w-24">Discipline</div>
        <div className="w-20 text-right">Hours</div>
        <div className="flex-[2]">Reason</div>
        <div className="w-20 text-right">Created</div>
        {canManage && <div className="w-16" />}
      </div>
      <div className="divide-y divide-white/5">
        {discounts.map((d) => {
          const isEditing = editingId === d.id;
          return (
            <div
              key={d.id}
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.02] text-xs"
            >
              <div className="flex-1 truncate">{epicName(d.epic_id)}</div>
              <div className="w-24 text-dim">{disciplineLabel[d.discipline]}</div>
              <div className="w-20 text-right font-mono text-health-bad">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="h-6 text-xs font-mono text-right"
                  />
                ) : (
                  <>−{formatHours(d.hours)}</>
                )}
              </div>
              <div className="flex-[2] text-dim">
                {isEditing ? (
                  <Input
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="h-6 text-xs"
                  />
                ) : (
                  <span className="truncate block" title={d.reason}>
                    {d.reason}
                  </span>
                )}
              </div>
              <div className="w-20 text-right text-dimmer font-mono">
                {format(new Date(d.created_at), "d MMM")}
              </div>
              {canManage && (
                <div className="w-16 flex items-center justify-end gap-1">
                  {isEditing ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-health-good"
                        onClick={() => saveEdit(d.id)}
                        disabled={busy}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEdit(d.id, d.hours, d.reason)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-dimmer hover:text-health-bad"
                        onClick={() => remove(d.id)}
                        disabled={busy}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
