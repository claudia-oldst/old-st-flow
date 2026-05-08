import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_ROLES as ROLES, PROJECT_ROLE_COLORS as ROLE_COLORS, type Project, type ProjectMember, type ProjectRole, type TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Plus, Settings, Trash2, Eye, Archive } from "lucide-react";
import { toast } from "sonner";
import { ArchiveProjectDialog } from "@/features/vault/ArchiveProjectDialog";
import { ProjectLinksEditor } from "./settings/ProjectLinksEditor";
import type { ProjectLink } from "./settings/types";

export type { ProjectLink } from "./settings/types";

interface Props {
  project: Project;
  canEdit: boolean;
  onUpdated?: (p: Project) => void;
}

export function ProjectSettingsDialog({ project, canEdit, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [acronym, setAcronym] = useState(project.acronym);
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [rate, setRate] = useState<string>(String(project.rate_per_hour ?? 0));
  const [startDate, setStartDate] = useState<string>(project.start_date ?? "");
  const [links, setLinks] = useState<ProjectLink[]>(
    Array.isArray(project.links) ? (project.links as unknown as ProjectLink[]) : []
  );

  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pickedUser, setPickedUser] = useState<string>("");
  const [pickedRole, setPickedRole] = useState<ProjectRole>("Frontend");

  const loadMembers = async () => {
    const [{ data: pm }, { data: all }] = await Promise.all([
      supabase
        .from("project_members")
        .select("*, member:team_members(*)")
        .eq("project_id", project.id),
      supabase.from("team_members").select("*").order("name"),
    ]);
    setMembers((pm as any) ?? []);
    setAllMembers(all ?? []);
  };

  useEffect(() => {
    if (open) {
      loadMembers();
      setName(project.name);
      setAcronym(project.acronym);
      setClientName(project.client_name ?? "");
      setRate(String(project.rate_per_hour ?? 0));
      setStartDate(project.start_date ?? "");
      setLinks(Array.isArray(project.links) ? (project.links as unknown as ProjectLink[]) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  const available = allMembers.filter((m) => !members.some((pm) => pm.user_id === m.id));

  const handleSaveDetails = async () => {
    if (!canEdit) return;
    const trimmedName = name.trim();
    if (!trimmedName) return toast.error("Project name is required");
    const numericRate = Number(rate);
    if (Number.isNaN(numericRate) || numericRate < 0) return toast.error("Rate must be a positive number");
    const cleanedLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.url.length > 0);

    const { data, error } = await supabase
      .from("projects")
      .update({
        name: trimmedName,
        acronym: acronym.trim().toUpperCase(),
        client_name: clientName.trim() || null,
        rate_per_hour: numericRate,
        start_date: startDate ? startDate : null,
        links: cleanedLinks as unknown as Project["links"],
      })
      .eq("id", project.id)
      .select("*")
      .single();

    if (error) return toast.error(error.message);
    toast.success("Project updated");
    onUpdated?.(data as Project);
  };

  const handleAdd = async () => {
    if (!pickedUser) return toast.error("Pick a user");
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: pickedUser, role: pickedRole });
    if (error) return toast.error(error.message);
    toast.success("Member added");
    setPickedUser("");
    setPickedRole("Frontend");
    loadMembers();
  };

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("project_id", project.id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    loadMembers();
  };

  const handleRemove = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    loadMembers();
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-dim hover:text-foreground"
          title={canEdit ? "Project settings" : "View project info"}
          aria-label={canEdit ? "Project settings" : "View project info"}
        >
          {canEdit ? <Settings className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {canEdit ? "Project settings" : "Project info"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Project name</Label>
                <Input
                  id="proj-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-acronym">Acronym</Label>
                <Input
                  id="proj-acronym"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                  disabled={!canEdit}
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-client">Client name</Label>
                <Input
                  id="proj-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Acme Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-rate">Rate (£/hr)</Label>
                <Input
                  id="proj-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-start">Start date</Label>
                <Input
                  id="proj-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!canEdit}
                />
                <div className="text-[10px] text-dimmer">
                  Used as the X-axis start on Health charts.
                </div>
              </div>
            </div>

            <ProjectLinksEditor links={links} canEdit={canEdit} onChange={setLinks} />

            {canEdit && !project.is_archived && (
              <div className="hairline-t pt-4 mt-2">
                <div className="text-xs uppercase tracking-wider text-dimmer mb-2">
                  Danger zone
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-dim">
                    Move this project to the vault. Live data is exported then
                    deleted to free up rows.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-amber-400 hover:text-amber-300"
                    onClick={() => setArchiveOpen(true)}
                  >
                    <Archive className="h-4 w-4" /> Archive project
                  </Button>
                </div>
              </div>
            )}

            {canEdit && (
              <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={handleSaveDetails}>Save changes</Button>
              </DialogFooter>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4 mt-4">
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
                          onClick={() => handleRemove(pm.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      <ArchiveProjectDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        project={project}
      />
    </Dialog>
  );
}
