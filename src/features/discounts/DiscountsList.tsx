import { useMemo, useState } from "react";
import { Trash2, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/utils";
import { useEpicDiscounts } from "./useEpicDiscounts";
import type { Epic } from "@/features/epics/useProjectEpics";

interface Props {
  projectId: string;
  epics: Epic[];
  canManage: boolean;
}

type SortKey = "epic" | "discipline" | "hours" | "reason" | "date";

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
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [epicFilter, setEpicFilter] = useState<string[] | null>(null);
  const [discFilter, setDiscFilter] = useState<string[] | null>(null);

  const epicOptions = useMemo(
    () =>
      [...new Set(discounts.map((d) => d.epic_id))].map((id) => ({
        value: String(id),
        label: epics.find((e) => e.id === id)?.epic_name ?? `Epic ${id}`,
      })),
    [discounts, epics],
  );
  const discOptions = useMemo(
    () => [...new Set(discounts.map((d) => d.discipline))].map((v) => ({ value: v, label: disciplineLabel[v] ?? v })),
    [discounts],
  );

  const visible = useMemo(() => {
    const rank = (id: number) => { const i = epics.findIndex((e) => e.id === id); return i < 0 ? 1e9 : i; };
    const val = (d: (typeof discounts)[number]): string | number =>
      sort.key === "epic" ? rank(d.epic_id)
      : sort.key === "discipline" ? d.discipline
      : sort.key === "hours" ? Number(d.hours)
      : sort.key === "reason" ? (d.reason ?? "").toLowerCase()
      : new Date(d.applied_at ?? d.created_at).getTime();
    return discounts
      .filter((d) => !epicFilter || epicFilter.includes(String(d.epic_id)))
      .filter((d) => !discFilter || discFilter.includes(d.discipline))
      .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [discounts, epics, sort, epicFilter, discFilter]);

  const head = (key: SortKey, label: string, cls: string) => (
    <button
      type="button"
      onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))}
      className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", cls, sort.key === key && "text-foreground")}
    >
      {label}
      {sort.key === key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

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
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-white/5">
        <MultiSelectFilter label="Epic" options={epicOptions} selected={epicFilter ?? epicOptions.map((o) => o.value)} onChange={setEpicFilter} searchable />
        <MultiSelectFilter label="Discipline" options={discOptions} selected={discFilter ?? discOptions.map((o) => o.value)} onChange={setDiscFilter} />
      </div>
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
        <div className="flex-1">{head("epic", "Epic", "")}</div>
        <div className="w-24">{head("discipline", "Discipline", "")}</div>
        <div className="w-20 text-right">{head("hours", "Hours", "justify-end w-full")}</div>
        <div className="flex-[2]">{head("reason", "Reason", "")}</div>
        <div className="w-28 text-right">{head("date", "Applies from", "justify-end w-full")}</div>
        {canManage && <div className="w-16" />}
      </div>
      <div className="divide-y divide-white/5">
        {visible.length === 0 && (
          <div className="px-4 py-4 text-xs text-dim text-center">No discounts match these filters.</div>
        )}
        {visible.map((d) => {
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
              <div className="w-28 text-right text-dimmer font-mono">
                {canManage ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1 text-xs font-mono text-dimmer hover:text-foreground"
                      >
                        {format(new Date(d.applied_at ?? d.created_at), "d MMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={new Date(d.applied_at ?? d.created_at)}
                        onSelect={(date) =>
                          date &&
                          update({
                            id: d.id,
                            patch: { applied_at: format(date, "yyyy-MM-dd") },
                          })
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  format(new Date(d.applied_at ?? d.created_at), "d MMM yyyy")
                )}
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
