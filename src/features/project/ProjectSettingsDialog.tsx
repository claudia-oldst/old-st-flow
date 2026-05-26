import { useState } from "react";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Eye } from "lucide-react";
import { ArchiveProjectDialog } from "@/features/vault/ArchiveProjectDialog";
import { useProjectSettings } from "./settings/useProjectSettings";
import { ProjectDetailsTab } from "./settings/ProjectDetailsTab";
import { ProjectTeamTab } from "./settings/ProjectTeamTab";

export type { ProjectLink } from "./settings/types";

interface Props {
  project: Project;
  canEdit: boolean;
  onUpdated?: (p: Project) => void;
}

export function ProjectSettingsDialog({ project, canEdit, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const s = useProjectSettings(project, open, onUpdated);

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

          <TabsContent value="details">
            <ProjectDetailsTab
              project={project}
              canEdit={canEdit}
              name={s.name} setName={s.setName}
              acronym={s.acronym} setAcronym={s.setAcronym}
              clientName={s.clientName} setClientName={s.setClientName}
              rate={s.rate} setRate={s.setRate}
              startDate={s.startDate} setStartDate={s.setStartDate}
              links={s.links} setLinks={s.setLinks}
              githubRepoUrl={s.githubRepoUrl} setGithubRepoUrl={s.setGithubRepoUrl}
              onSave={s.handleSaveDetails}
              onClose={() => setOpen(false)}
              onArchive={() => setArchiveOpen(true)}
            />
          </TabsContent>

          <TabsContent value="team">
            <ProjectTeamTab
              canEdit={canEdit}
              members={s.members}
              allMembers={s.allMembers}
              onAdd={s.addMember}
              onRoleChange={s.updateMemberRole}
              onRemove={s.removeMember}
            />
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
