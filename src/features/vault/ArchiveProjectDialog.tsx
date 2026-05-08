import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { Project } from "@/lib/types";
import { useArchiveProject } from "./useArchiveProject";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ArchiveProjectDialog({ open, onOpenChange, project }: Props) {
  const [confirm, setConfirm] = useState("");
  const archive = useArchiveProject();
  const matches = confirm.trim().toUpperCase() === project.acronym.toUpperCase();

  const handleArchive = async () => {
    if (!matches) return;
    await archive.mutateAsync(project.id);
    setConfirm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirm(""); }}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-gold" />
            Archive {project.acronym}?
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span className="block">
              This will move all project data to cold storage (a JSON restore
              point and an Excel report) and then <strong>delete</strong> the live
              tickets, time logs, comments, change requests and member
              assignments. The project skeleton row is kept so it can be restored
              later.
            </span>
            <span className="block text-amber-400">
              The public client portal link will stop working immediately.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>
            Type <span className="font-mono text-foreground">{project.acronym}</span> to confirm
          </Label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder={project.acronym}
            className="font-mono uppercase"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || archive.isPending}
            onClick={handleArchive}
          >
            {archive.isPending ? "Archiving…" : "Archive to vault"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
