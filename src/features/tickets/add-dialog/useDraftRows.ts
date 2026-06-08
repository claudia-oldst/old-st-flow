import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember, TicketType } from "@/lib/types";
import { Draft, Slot, newDraft } from "./types";

export function useDraftRows({
  open,
  projectId,
  defaultType,
  defaultStatusId,
  onCreated,
  onClose,
}: {
  open: boolean;
  projectId: string;
  defaultType: TicketType;
  defaultStatusId: string | null;
  onCreated: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([newDraft(null, defaultType)]);
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDrafts([newDraft(defaultStatusId, defaultType)]);
    }
  }, [open, defaultStatusId, defaultType]);

  useEffect(() => {
    if (!defaultStatusId) return;
    setDrafts((prev) =>
      prev.map((d) => (d.statusId ? d : { ...d, statusId: defaultStatusId }))
    );
  }, [defaultStatusId]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, projectId]);

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const remove = (key: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.key !== key)));

  const addAnother = () => setDrafts((prev) => [...prev, newDraft(defaultStatusId, defaultType)]);

  const validDrafts = useMemo(
    () => drafts.filter((d) => d.title.trim().length > 0 && d.epicId !== null),
    [drafts],
  );

  const submit = async () => {
    if (validDrafts.length === 0) return;
    setBusy(true);
    const payload = validDrafts.map((d) => {
      const isProj = d.type === "Proj";
      const feBlank = d.fe.trim() === "";
      const beBlank = d.be.trim() === "";
      const projBlank = d.proj.trim() === "";
      const fe = feBlank ? null : (parseFloat(d.fe) || 0);
      const be = beBlank ? null : (parseFloat(d.be) || 0);
      const proj = projBlank ? null : (parseFloat(d.proj) || 0);
      return {
        project_id: projectId,
        title: d.title.trim(),
        ticket_type: d.type,
        status_id: d.statusId,
        epic_id: d.epicId,
        original_fe_estimate: isProj ? null : fe,
        original_be_estimate: isProj ? null : be,
        current_fe_estimate: isProj ? null : fe,
        current_be_estimate: isProj ? null : be,
        original_project_estimate: isProj ? proj : null,
        current_project_estimate: isProj ? proj : null,
        parent_ticket_id: d.type === "Bug" ? d.parentTicketId : null,
        ticket_number: 0,
        formatted_id: "",
      };
    });

    const { data: created, error } = await supabase
      .from("tickets")
      .insert(payload as any)
      .select("id");

    if (error || !created) {
      setBusy(false);
      return toast.error(error?.message ?? "Failed to create tickets");
    }

    const assigneeRows: { ticket_id: string; user_id: string; slot: Slot }[] = [];
    created.forEach((row: any, idx: number) => {
      const d = validDrafts[idx];
      if (!d) return;
      const isProj = d.type === "Proj";
      if (isProj) {
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      } else {
        d.assignees.fe.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "FE" })
        );
        d.assignees.be.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "BE" })
        );
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      }
    });

    if (assigneeRows.length > 0) {
      const { error: aErr } = await supabase.from("ticket_assignees").insert(assigneeRows);
      if (aErr) {
        toast.error("Tickets created, but assignment failed: " + aErr.message);
      }
    }

    try {
      await onCreated();
    } catch {
      /* parent handles its own errors */
    }
    setBusy(false);
    toast.success(
      `Created ${created.length} ticket${created.length === 1 ? "" : "s"}`
    );
    onClose();
  };

  return { drafts, members, busy, validDrafts, update, remove, addAnother, submit };
}
