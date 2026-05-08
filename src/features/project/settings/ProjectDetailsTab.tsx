import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Archive } from "lucide-react";
import type { Project } from "@/lib/types";
import { ProjectLinksEditor } from "./ProjectLinksEditor";
import type { ProjectLink } from "./types";

interface Props {
  project: Project;
  canEdit: boolean;
  name: string; setName: (v: string) => void;
  acronym: string; setAcronym: (v: string) => void;
  clientName: string; setClientName: (v: string) => void;
  rate: string; setRate: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  links: ProjectLink[]; setLinks: (v: ProjectLink[]) => void;
  onSave: () => void;
  onClose: () => void;
  onArchive: () => void;
}

export function ProjectDetailsTab({
  project, canEdit,
  name, setName, acronym, setAcronym,
  clientName, setClientName, rate, setRate,
  startDate, setStartDate, links, setLinks,
  onSave, onClose, onArchive,
}: Props) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="proj-name">Project name</Label>
          <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
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
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Danger zone</div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-dim">
              Move this project to the vault. Live data is exported then deleted to free up rows.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-amber-400 hover:text-amber-300"
              onClick={onArchive}
            >
              <Archive className="h-4 w-4" /> Archive project
            </Button>
          </div>
        </div>
      )}

      {canEdit && (
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={onSave}>Save changes</Button>
        </DialogFooter>
      )}
    </div>
  );
}
