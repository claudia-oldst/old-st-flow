import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  PROJECT_ROLES as ROLES,
  PROJECT_ROLE_COLORS as ROLE_COLORS,
  type ProjectMember, type ProjectRole, type TeamMember,
} from "@/lib/types";

interface Props {
  canEdit: boolean;
  members: (ProjectMember & { member: TeamMember })[];
  allMembers: TeamMember[];
  onAdd: (userId: string, role: ProjectRole) => void;
  onRoleChange: (userId: string, role: ProjectRole) => void;
  onRemove: (userId: string) => void;
}

export function ProjectTeamTab({
  canEdit, members, allMembers, onAdd, onRoleChange, onRemove,
}: Props) {
  const [pickedUser, setPickedUser] = useState<string>("");
  const [pickedRole, setPickedRole] = useState<ProjectRole>("Frontend");
  const available = allMembers.filter((m) => !members.some((pm) => pm.user_id === m.id));

  const handleAdd = () => {
    if (!pickedUser) return toast.error("Pick a user");
    onAdd(pickedUser, pickedRole);
    setPickedUser("");
    setPickedRole("Frontend");
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="text-dim text-sm">
        Members assigned to this project. Roles drive who can be assigned to ticket FE/BE slots.
      </div>

      {canEdit && (
        <div className="glass rounded-xl p-3 space-y-3">
          <div className="text-xs uppercase tracking-wider text-dimmer">Add member</div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select value={pickedUser} onValueChange={setPickedUser}>
                <SelectTrigger><SelectValue placeholder="Pick a team member" /></SelectTrigger>
                <SelectContent>
                  {available.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Select value={pickedRole} onValueChange={(v) => setPickedRole(v as ProjectRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!pickedUser} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center text-dim text-sm py-6">No members on this project yet.</div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {members.map((pm) => (
              <div key={pm.user_id} className="flex items-center gap-3 px-3 py-2.5">
                <MemberAvatar name={pm.member.name} color={pm.member.avatar_color} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{pm.member.name}</div>
                  <div className="text-xs text-dim truncate">{pm.member.email}</div>
                </div>
                {canEdit ? (
                  <Select value={pm.role} onValueChange={(v) => onRoleChange(pm.user_id, v as ProjectRole)}>
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
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${ROLE_COLORS[pm.role]}`}>
                    {pm.role}
                  </span>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-dimmer hover:text-destructive"
                    onClick={() => onRemove(pm.user_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
