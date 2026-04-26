import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Check, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "add" | "replace";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  ticketIds: string[];
  onSaved: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  projectId,
  ticketIds,
  onSaved,
}: Props) {
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [feUserIds, setFeUserIds] = useState<Set<string>>(new Set());
  const [beUserIds, setBeUserIds] = useState<Set<string>>(new Set());
  const [otherUserIds, setOtherUserIds] = useState<Set<string>>(new Set());
  const [projectUserIds, setProjectUserIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [projTicketIds, setProjTicketIds] = useState<Set<string>>(new Set());
  const [standardTicketIds, setStandardTicketIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setFeUserIds(new Set());
    setBeUserIds(new Set());
    setOtherUserIds(new Set());
    setProjectUserIds(new Set());
    setMode("add");
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setMembers(((data as any) ?? []) as (ProjectMember & { member: TeamMember })[]));
    if (ticketIds.length) {
      supabase
        .from("tickets")
        .select("id, ticket_type")
        .in("id", ticketIds)
        .then(({ data }) => {
          const proj = new Set<string>();
          const std = new Set<string>();
          (data ?? []).forEach((t: { id: string; ticket_type: string }) => {
            if (t.ticket_type === "Proj") proj.add(t.id);
            else std.add(t.id);
          });
          setProjTicketIds(proj);
          setStandardTicketIds(std);
        });
    } else {
      setProjTicketIds(new Set());
      setStandardTicketIds(new Set());
    }
  }, [open, projectId, ticketIds]);

  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");
  const otherEligible = members;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const totalPicked = feUserIds.size + beUserIds.size + otherUserIds.size + projectUserIds.size;
  const hasProj = projTicketIds.size > 0;
  const hasStandard = standardTicketIds.size > 0;

  const handleSave = async () => {
    if (ticketIds.length === 0) return;
    if (mode === "add" && totalPicked === 0) {
      return toast.error("Pick at least one assignee");
    }
    setBusy(true);

    if (mode === "replace") {
      const { error: delErr } = await supabase
        .from("ticket_assignees")
        .delete()
        .in("ticket_id", ticketIds);
      if (delErr) {
        setBusy(false);
        return toast.error(delErr.message);
      }
    }

    let rows: { ticket_id: string; user_id: string; slot: "FE" | "BE" | "Project" }[] = [];
    // Standard / Bug / CR tickets: FE / BE / Project Contributors.
    standardTicketIds.forEach((tid) => {
      feUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "FE" }));
      beUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "BE" }));
      otherUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "Project" }));
    });
    // Proj tickets: Project slot only.
    projTicketIds.forEach((tid) => {
      projectUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "Project" }));
    });

    // In "add" mode, skip rows that already exist to avoid duplicate-key errors.
    if (mode === "add" && rows.length) {
      const { data: existing, error: exErr } = await supabase
        .from("ticket_assignees")
        .select("ticket_id, user_id, slot")
        .in("ticket_id", ticketIds);
      if (exErr) {
        setBusy(false);
        return toast.error(exErr.message);
      }
      const seen = new Set(
        (existing ?? []).map((e) => `${e.ticket_id}|${e.user_id}|${e.slot}`)
      );
      rows = rows.filter((r) => !seen.has(`${r.ticket_id}|${r.user_id}|${r.slot}`));
    }

    if (rows.length) {
      const { error } = await supabase.from("ticket_assignees").insert(rows);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }

    // After mutating assignees, reset fe_status/be_status to "todo" on any
    // ticket whose slot now has zero assignees, so unassigned slots can't
    // ghost-influence the auto-derived project status.
    const { data: finalAssignees } = await supabase
      .from("ticket_assignees")
      .select("ticket_id, slot")
      .in("ticket_id", ticketIds);
    const haveFE = new Set<string>();
    const haveBE = new Set<string>();
    (finalAssignees ?? []).forEach((a) => {
      if (a.slot === "FE") haveFE.add(a.ticket_id);
      else if (a.slot === "BE") haveBE.add(a.ticket_id);
    });
    const resetFEIds = ticketIds.filter((id) => !haveFE.has(id));
    const resetBEIds = ticketIds.filter((id) => !haveBE.has(id));
    if (resetFEIds.length) {
      await supabase.from("tickets").update({ fe_status: "todo" }).in("id", resetFEIds);
    }
    if (resetBEIds.length) {
      await supabase.from("tickets").update({ be_status: "todo" }).in("id", resetBEIds);
    }

    setBusy(false);
    toast.success(
      mode === "replace"
        ? `Replaced assignees on ${ticketIds.length} ticket${ticketIds.length === 1 ? "" : "s"}`
        : `Added assignees to ${ticketIds.length} ticket${ticketIds.length === 1 ? "" : "s"}`
    );
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Assign to {ticketIds.length} ticket{ticketIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Pick developers and choose whether to add them to existing assignees or replace all current assignees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
          <button
            onClick={() => setMode("add")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition",
              mode === "add" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            Add to existing
          </button>
          <button
            onClick={() => setMode("replace")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition",
              mode === "replace" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            Replace all
          </button>
        </div>

        {mode === "replace" && totalPicked === 0 && (
          <div className="text-xs text-amber-400/90 bg-amber-500/5 hairline rounded-lg px-3 py-2">
            Saving with no one selected will clear all assignees on the selected tickets.
          </div>
        )}

        {hasProj && hasStandard && (
          <div className="text-xs text-dim bg-white/5 hairline rounded-lg px-3 py-2">
            Selection mixes Proj tickets with Standard/Bug/CR tickets. FE/BE/Other picks apply only to non-Proj tickets; Project picks apply only to Proj tickets.
          </div>
        )}

        <div className="space-y-6 pt-2 max-h-[50vh] overflow-y-auto">
          {hasStandard && (
            <>
              <Slot
                label="Frontend"
                members={feEligible}
                selected={feUserIds}
                onToggle={(id) => toggle(feUserIds, setFeUserIds, id)}
              />
              <Slot
                label="Backend"
                members={beEligible}
                selected={beUserIds}
                onToggle={(id) => toggle(beUserIds, setBeUserIds, id)}
              />
              <Slot
                label="Other contributors"
                members={otherEligible}
                selected={otherUserIds}
                onToggle={(id) => toggle(otherUserIds, setOtherUserIds, id)}
              />
            </>
          )}
          {hasProj && (
            <Slot
              label={`Project team${hasStandard ? " (Proj tickets only)" : ""}`}
              members={otherEligible}
              selected={projectUserIds}
              onToggle={(id) => toggle(projectUserIds, setProjectUserIds, id)}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {mode === "replace" ? "Replace assignees" : "Add assignees"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Slot({
  label,
  members,
  selected,
  onToggle,
}: {
  label: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-dimmer mb-2">{label}</div>
      {members.length === 0 ? (
        <div className="text-sm text-dim p-3 rounded-lg bg-white/5 hairline">
          No eligible project members.
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
                <span className="text-[10px] opacity-60">{m.role}</span>
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
