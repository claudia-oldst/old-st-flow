import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Check, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Slot = "FE" | "BE" | "Project";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  projectId: string;
  /** Type of the ticket — drives which slot pickers are shown. */
  ticketType?: "Standard" | "Bug" | "CR" | "Proj";
  current: Array<{ user_id: string; slot: Slot }>;
  onSaved: () => void;
}

export function AssignDialog({ open, onOpenChange, ticketId, projectId, ticketType = "Standard", current, onSaved }: Props) {
  const isProj = ticketType === "Proj";
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [feUserIds, setFeUserIds] = useState<Set<string>>(new Set());
  const [beUserIds, setBeUserIds] = useState<Set<string>>(new Set());
  const [projectUserIds, setProjectUserIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFeUserIds(new Set(current.filter((c) => c.slot === "FE").map((c) => c.user_id)));
    setBeUserIds(new Set(current.filter((c) => c.slot === "BE").map((c) => c.user_id)));
    setProjectUserIds(new Set(current.filter((c) => c.slot === "Project").map((c) => c.user_id)));
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers(((data ?? []) as unknown) as (ProjectMember & { member: TeamMember })[]));
  }, [open, projectId, current]);

  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");
  // Project Contributors slot accepts any project member.
  const projectEligible = members;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleSave = async () => {
    setBusy(true);
    // Replace all assignees for this ticket
    await supabase.from("ticket_assignees").delete().eq("ticket_id", ticketId);
    const rows: { ticket_id: string; user_id: string; slot: Slot }[] = [];
    if (isProj) {
      projectUserIds.forEach((uid) => rows.push({ ticket_id: ticketId, user_id: uid, slot: "Project" }));
    } else {
      feUserIds.forEach((uid) => rows.push({ ticket_id: ticketId, user_id: uid, slot: "FE" }));
      beUserIds.forEach((uid) => rows.push({ ticket_id: ticketId, user_id: uid, slot: "BE" }));
      projectUserIds.forEach((uid) => rows.push({ ticket_id: ticketId, user_id: uid, slot: "Project" }));
    }
    if (rows.length) {
      const { error } = await supabase.from("ticket_assignees").insert(rows);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }
    if (!isProj) {
      // If a slot lost its last assignee in this save, reset that slot's status to "todo"
      // so an unassigned slot can't keep influencing the auto-derived project status.
      const hadFE = current.some((c) => c.slot === "FE");
      const hadBE = current.some((c) => c.slot === "BE");
      const patch: { fe_status?: "todo"; be_status?: "todo" } = {};
      if (hadFE && feUserIds.size === 0) patch.fe_status = "todo";
      if (hadBE && beUserIds.size === 0) patch.be_status = "todo";
      if (Object.keys(patch).length) {
        await supabase.from("tickets").update(patch).eq("id", ticketId);
      }
    }
    setBusy(false);
    toast.success("Assignees updated");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Assign people
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2 max-h-[60vh] overflow-y-auto">
          {isProj ? (
            <SlotPicker
              label="Team members"
              description="Anyone assigned can log time to this ticket's shared project estimate."
              members={projectEligible}
              selected={projectUserIds}
              onToggle={(id) => toggle(projectUserIds, setProjectUserIds, id)}
              showRole
            />
          ) : (
            <>
              <SlotPicker
                label="Frontend"
                description="Drives FE estimates, status & timer."
                members={feEligible}
                selected={feUserIds}
                onToggle={(id) => toggle(feUserIds, setFeUserIds, id)}
              />
              <SlotPicker
                label="Backend"
                description="Drives BE estimates, status & timer."
                members={beEligible}
                selected={beUserIds}
                onToggle={(id) => toggle(beUserIds, setBeUserIds, id)}
              />
              <SlotPicker
                label="Project contributors"
                description="QA, PMBA, Design — anyone else on the ticket. Time logged here goes to the ticket's shared Project bucket."
                members={projectEligible}
                selected={projectUserIds}
                onToggle={(id) => toggle(projectUserIds, setProjectUserIds, id)}
                showRole
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlotPicker({
  label,
  description,
  members,
  selected,
  onToggle,
  showRole,
}: {
  label: string;
  description?: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showRole?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-dimmer mb-1">{label}</div>
      {description && <div className="text-[11px] text-dimmer mb-2">{description}</div>}
      {members.length === 0 ? (
        <div className="text-sm text-dim p-3 rounded-lg bg-white/5 hairline">
          No project members available. Add one in the Team tab.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const active = selected.has(m.user_id);
            return (
              <button
                key={m.user_id}
                onClick={() => onToggle(m.user_id)}
                className={cn(
                  "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm transition",
                  active ? "bg-foreground text-background" : "bg-white/5 hairline text-foreground hover:bg-white/10"
                )}
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                {showRole && <span className="text-[10px] opacity-60">{m.role}</span>}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
