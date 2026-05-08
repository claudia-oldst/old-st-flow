import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_ROLES as ROLES, type ProjectRole, type TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PRESET_COLORS } from "./adminConstants";

export function TeamAdmin() {
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
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email required");
    const { error } = await supabase.from("team_members").insert({
      name: name.trim(), email: email.trim().toLowerCase(), avatar_color: color, role,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false); setName(""); setEmail(""); setRole("Fullstack");
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
                    {ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
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
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
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
