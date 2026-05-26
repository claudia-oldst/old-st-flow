import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { toast } from "sonner";
import { syncTicketsToGithub } from "@/features/github/syncTicket";

export type BulkAssignMode = "add" | "replace";

export function useBulkAssign({
  open,
  projectId,
  ticketIds,
  onSaved,
  onClose,
}: {
  open: boolean;
  projectId: string;
  ticketIds: string[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [feUserIds, setFeUserIds] = useState<Set<string>>(new Set());
  const [beUserIds, setBeUserIds] = useState<Set<string>>(new Set());
  const [otherUserIds, setOtherUserIds] = useState<Set<string>>(new Set());
  const [projectUserIds, setProjectUserIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<BulkAssignMode>("add");
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
      .then(({ data }) =>
        setMembers(((data ?? []) as unknown) as (ProjectMember & { member: TeamMember })[])
      );
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
    standardTicketIds.forEach((tid) => {
      feUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "FE" }));
      beUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "BE" }));
      otherUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "Project" }));
    });
    projTicketIds.forEach((tid) => {
      projectUserIds.forEach((uid) => rows.push({ ticket_id: tid, user_id: uid, slot: "Project" }));
    });

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
    onClose();
    void syncTicketsToGithub(ticketIds);
  };

  return {
    feEligible,
    beEligible,
    otherEligible,
    feUserIds,
    setFeUserIds,
    beUserIds,
    setBeUserIds,
    otherUserIds,
    setOtherUserIds,
    projectUserIds,
    setProjectUserIds,
    toggle,
    mode,
    setMode,
    busy,
    totalPicked,
    hasProj,
    hasStandard,
    handleSave,
  };
}
