import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectRole, Status, StatusCategory, TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Settings, Users, Layers } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: StatusCategory; label: string; description: string }[] = [
  { value: "backlog", label: "Backlog", description: "Not started; logging time prompts move to active" },
  { value: "active", label: "Active", description: "In progress" },
  { value: "done", label: "Done", description: "Excluded from open work counts" },
];

const PRESET_COLORS = ["#94a3b8", "#3b82f6", "#a855f7", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444"];

const ROLES: ProjectRole[] = ["Frontend", "Backend", "Fullstack", "QA", "PMBA"];

export default function Admin() {
  const [tab, setTab] = useState<"team" | "statuses">("team");
  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">Workspace</div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7" /> Admin
        </h1>
      </div>

      <div className="flex gap-1 hairline-b mb-6">
        <TabButton active={tab === "team"} onClick={() => setTab("team")} icon={<Users className="h-3.5 w-3.5" />}>
          Team members
        </TabButton>
        <TabButton active={tab === "statuses"} onClick={() => setTab("statuses")} icon={<Layers className="h-3.5 w-3.5" />}>
          Statuses
        </TabButton>
      </div>

      {tab === "team" ? <TeamAdmin /> : <StatusesAdmin />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm transition relative inline-flex items-center gap-1.5 ${
        active ? "text-foreground" : "text-dim hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {active && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
    </button>
  );
}

function TeamAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[1]);
  const [role, setRole] = useState<ProjectRole>("Fullstack");

  const load = async () => {
    const { data } = await supabase.from("team_members").select("*").order("name");
    setMembers(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email required");
    const { error } = await supabase.from("team_members").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar_color: color,
      role,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false);
    setName("");
    setEmail("");
    setRole("Fullstack");
    load();
  };

  const handleRoleChange = async (id: string, newRole: ProjectRole) => {
    const { error } = await supabase.from("team_members").update({ role: newRole }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-dim text-sm">All team members across the agency.</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add member</Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Avatar color</Label>
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
              <Button onClick={handleAdd}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
              <MemberAvatar name={m.name} color={m.avatar_color} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.name}</div>
                <div className="text-xs text-dim truncate">{m.email}</div>
              </div>
              <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as ProjectRole)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="text-dimmer hover:text-destructive" onClick={() => handleRemove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusesAdmin() {
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
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setCategory("active");
    setColor(PRESET_COLORS[1]);
    setOpen(true);
  };
  const openEdit = (s: Status) => {
    setEditing(s);
    setName(s.name);
    setCategory(s.category);
    setColor(s.color);
    setOpen(true);
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
        name: name.trim(),
        category,
        color,
        position: nextPos,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    load();
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
