import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import type { Status, StatusCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { PRESET_COLORS } from "./adminConstants";

const CATEGORY_DESCRIPTIONS: Record<StatusCategory, string> = {
  backlog: "Not started; logging time prompts move to active",
  active: "In progress",
  "dev done": "Estimates auto-snap to actuals; still counts as open",
  done: "Excluded from open work counts",
};
const CATEGORIES: { value: StatusCategory; label: string; description: string }[] =
  (Constants.public.Enums.status_category as readonly StatusCategory[]).map((value) => ({
    value,
    label: value.replace(/\b\w/g, (c) => c.toUpperCase()),
    description: CATEGORY_DESCRIPTIONS[value] ?? "",
  }));

export function StatusesAdmin() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StatusCategory>("active");
  const [color, setColor] = useState(PRESET_COLORS[1]);

  const load = async () => {
    const { data } = await supabase.from("statuses").select("*").order("position");
    setStatuses(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setName(""); setCategory("active"); setColor(PRESET_COLORS[1]); setOpen(true);
  };
  const openEdit = (s: Status) => {
    setEditing(s); setName(s.name); setCategory(s.category); setColor(s.color); setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name required");
    if (editing) {
      const { error } = await supabase
        .from("statuses")
        .update({ name: name.trim(), category, color })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const nextPos = statuses.length ? Math.max(...statuses.map((s) => s.position)) + 1 : 1;
      const { error } = await supabase.from("statuses").insert({
        name: name.trim(), category, color, position: nextPos,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false); load();
  };

  const move = async (s: Status, dir: -1 | 1) => {
    const sorted = [...statuses].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((x) => x.id === s.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await supabase.from("statuses").update({ position: swap.position }).eq("id", s.id);
    await supabase.from("statuses").update({ position: s.position }).eq("id", swap.id);
    load();
  };

  const handleDelete = async (s: Status) => {
    if (!confirm(`Delete "${s.name}"? This will fail if any ticket uses it.`)) return;
    const { error } = await supabase.from("statuses").delete().eq("id", s.id);
    if (error) return toast.error("Cannot delete: " + error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-dim text-sm">Global statuses — these define the Kanban columns on every project's board.</div>
        <Button size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" />Add status</Button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {statuses.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
              <GripVertical className="h-4 w-4 text-dimmer" />
              <div className="h-3 w-3 rounded-full ring-1 ring-white/10" style={{ background: s.color }} />
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-dim capitalize">{s.category}</div>
              </div>
              <Button variant="ghost" size="icon" className="text-dimmer" onClick={() => move(s, -1)} disabled={i === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-dimmer" onClick={() => move(s, 1)} disabled={i === statuses.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
              <Button variant="ghost" size="icon" className="text-dimmer hover:text-destructive" onClick={() => handleDelete(s)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle>{editing ? "Edit status" : "New status"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as StatusCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div>
                        <div>{c.label}</div>
                        <div className="text-xs text-dimmer">{c.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full ring-2 transition ${color === c ? "ring-foreground" : "ring-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
