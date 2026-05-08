import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import { PROJECT_ROLES as ROLES, PROJECT_ROLE_COLORS as ROLE_COLORS, type ProjectMember, type ProjectRole, type TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";


export function ProjectTeam({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [pickedUser, setPickedUser] = useState<string>("");
  const [pickedRole, setPickedRole] = useState<ProjectRole>("Frontend");

  const load = useCallback(async () => {
    const [{ data: pm }, { data: all }] = await Promise.all([
      supabase
        .from("project_members")
        .select("*, member:team_members(*)")
        .eq("project_id", projectId),
      supabase.from("team_members").select("*").order("name"),
    ]);
    setMembers(((pm ?? []) as unknown) as (ProjectMember & { member: TeamMember })[]);
    setAllMembers(all ?? []);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    [
      { table: "project_members", filter: `project_id=eq.${projectId}` },
      { table: "team_members" },
    ],
    load,
  );

  const available = allMembers.filter((m) => !members.some((pm) => pm.user_id === m.id));

  const handleAdd = async () => {
    if (!pickedUser) return toast.error("Pick a user");
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: pickedUser, role: pickedRole });
    if (error) return toast.error(error.message);
    toast.success("Member added");
    setOpen(false);
    setPickedUser("");
    setPickedRole("Frontend");
    load();
  };

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    load();
  };

  const handleRemove = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-dim text-sm">
          Members assigned to this project. Roles drive who can fill ticket FE/BE slots — anyone can be added as a Project contributor (QA, PMBA, Design, etc.).
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" disabled={available.length === 0}>
              <Plus className="h-4 w-4" /> Add member
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Add to project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-dimmer">Member</div>
                <Select value={pickedUser} onValueChange={setPickedUser}>
                  <SelectTrigger><SelectValue placeholder="Pick a team member" /></SelectTrigger>
                  <SelectContent>
                    {available.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-dimmer">Role on this project</div>
                <Select value={pickedRole} onValueChange={(v) => setPickedRole(v as ProjectRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="h-8 w-8 mx-auto text-dimmer mb-3" />
          <div className="font-medium">No members yet</div>
          <div className="text-dim text-sm mt-1">Add team members to start assigning tickets.</div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {members.map((pm) => (
              <div key={pm.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
                <MemberAvatar name={pm.member.name} color={pm.member.avatar_color} size="md" />
                <div className="flex-1">
                  <div className="font-medium">{pm.member.name}</div>
                  <div className="text-xs text-dim">{pm.member.email}</div>
                </div>
                <Select value={pm.role} onValueChange={(v) => handleRoleChange(pm.user_id, v as ProjectRole)}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue>
                      <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${ROLE_COLORS[pm.role]}`}>
                        {pm.role}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-dimmer hover:text-destructive"
                  onClick={() => handleRemove(pm.user_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
