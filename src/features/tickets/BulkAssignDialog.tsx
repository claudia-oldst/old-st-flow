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
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFeUserIds(new Set());
    setBeUserIds(new Set());
    setMode("add");
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setMembers(((data as any) ?? []) as (ProjectMember & { member: TeamMember })[]));
  }, [open, projectId]);

  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const totalPicked = feUserIds.size + beUserIds.size;

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

    let rows: { ticket_id: string; user_id: string; slot: "FE" | "BE" }[] = [];
    ticketIds.forEach((tid) => {
      feUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "FE" }));
      beUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "BE" }));
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

        <div className="space-y-6 pt-2 max-h-[50vh] overflow-y-auto">
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
          No project members with a {label.toLowerCase()}-compatible role.
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
