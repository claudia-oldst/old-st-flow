import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { ParsedRow } from "./parsers";

/** Resolves epic names to ids, creating any that do not exist yet. */
async function resolveEpics(projectId: string, valid: ParsedRow[]) {
  const epicNames = Array.from(new Set(valid.map((r) => r.epic.trim()).filter(Boolean)));
  const epicMap = new Map<string, number>();
  if (epicNames.length === 0) return { epicMap, error: null as string | null };

  const { data: existing } = await supabase
    .from("project_epics")
    .select("id, epic_name")
    .eq("project_id", projectId);
  (existing ?? []).forEach((e: any) => {
    if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
  });

  const toCreate = epicNames.filter((n) => !epicMap.has(n.toLowerCase()));
  if (toCreate.length > 0) {
    const { data: created, error } = await supabase
      .from("project_epics")
      .insert(toCreate.map((name) => ({ project_id: projectId, epic_name: name })))
      .select("id, epic_name");
    if (error) return { epicMap, error: error.message };
    (created ?? []).forEach((e: any) => {
      if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
    });
  }
  return { epicMap, error: null as string | null };
}

/** Maps assignee emails to project member user ids, warning about unknown ones. */
async function resolveAssigneeEmails(projectId: string, valid: ParsedRow[]) {
  const allEmails = new Set<string>();
  valid.forEach((r) => {
    r.fe_assignee_emails.forEach((e) => allEmails.add(e));
    r.be_assignee_emails.forEach((e) => allEmails.add(e));
    r.project_assignee_emails.forEach((e) => allEmails.add(e));
  });
  const emailToUserId = new Map<string, string>();
  if (allEmails.size > 0) {
    const { data: pms } = await supabase
      .from("project_members")
      .select("user_id, member:team_members(email)")
      .eq("project_id", projectId);
    (pms ?? []).forEach((pm: any) => {
      const email = pm.member?.email;
      if (email) emailToUserId.set(email.trim().toLowerCase(), pm.user_id);
    });
  }
  const unknown = Array.from(allEmails).filter((e) => !emailToUserId.has(e));
  if (unknown.length > 0) {
    toast.warning(
      `Skipped ${unknown.length} unknown assignee email${unknown.length === 1 ? "" : "s"}: ${unknown.slice(0, 3).join(", ")}${unknown.length > 3 ? "…" : ""}`,
    );
  }
  return emailToUserId;
}

/** Looks up status ids by name — only needed for Proj-type rows. */
async function resolveStatusNames(valid: ParsedRow[]) {
  const statusNameToId = new Map<string, string>();
  const needed = valid.some((r) => r.type === "Proj" && r.project_status_name.trim());
  if (!needed) return statusNameToId;
  const { data: statuses } = await supabase.from("statuses").select("id, name");
  (statuses ?? []).forEach((s: any) => {
    if (s.name) statusNameToId.set(s.name.trim().toLowerCase(), s.id);
  });
  return statusNameToId;
}

function buildTicketPayload(
  projectId: string,
  valid: ParsedRow[],
  tickets: TicketRow[],
  epicMap: Map<string, number>,
  statusNameToId: Map<string, string>,
) {
  const parentNumToId = new Map<number, string>();
  tickets.forEach((t) => parentNumToId.set(t.ticket_number, t.id));

  const taken = new Set<number>(tickets.map((t) => t.ticket_number));
  valid.forEach((r) => {
    if (r.ticket_number != null) taken.add(r.ticket_number);
  });
  let cursor = 1;
  const nextFree = () => {
    while (taken.has(cursor)) cursor++;
    const n = cursor;
    taken.add(n);
    cursor++;
    return n;
  };

  const unknownStatuses = new Set<string>();
  const payload = valid.map((r) => {
    const isProj = r.type === "Proj";
    let status_id: string | undefined;
    if (isProj && r.project_status_name.trim()) {
      const key = r.project_status_name.trim().toLowerCase();
      const id = statusNameToId.get(key);
      if (id) status_id = id;
      else unknownStatuses.add(r.project_status_name.trim());
    }
    return {
      project_id: projectId,
      title: r.title,
      ticket_type: r.type,
      original_fe_estimate: isProj ? null : r.fe,
      original_be_estimate: isProj ? null : r.be,
      current_fe_estimate: isProj ? null : r.fe,
      current_be_estimate: isProj ? null : r.be,
      original_project_estimate: isProj ? r.proj : null,
      current_project_estimate: isProj ? r.proj : null,
      fe_status: isProj ? "todo" : r.fe_status,
      be_status: isProj ? "todo" : r.be_status,
      ...(status_id ? { status_id } : {}),
      epic_id: r.epic.trim() ? epicMap.get(r.epic.trim().toLowerCase()) ?? null : null,
      version: r.version.trim() || null,
      acceptance_criteria: r.acceptance_criteria.trim() || null,
      parent_ticket_id:
        r.type !== "Proj" && r.parent_ticket_number != null
          ? parentNumToId.get(r.parent_ticket_number) ?? null
          : null,
      ticket_number: r.ticket_number ?? nextFree(),
      formatted_id: "",
    };
  });
  return { payload, unknownStatuses };
}

function buildAssigneeRows(
  createdTickets: { id: string }[],
  valid: ParsedRow[],
  emailToUserId: Map<string, string>,
) {
  const rows: { ticket_id: string; user_id: string; slot: "FE" | "BE" | "Project" }[] = [];
  createdTickets.forEach((row, idx) => {
    const r = valid[idx];
    if (!r) return;
    const isProj = r.type === "Proj";
    const seen = new Set<string>();
    const add = (uid: string, slot: "FE" | "BE" | "Project") => {
      const key = `${uid}::${slot}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ ticket_id: row.id, user_id: uid, slot });
    };
    if (!isProj) {
      r.fe_assignee_emails.forEach((e) => {
        const uid = emailToUserId.get(e);
        if (uid) add(uid, "FE");
      });
      r.be_assignee_emails.forEach((e) => {
        const uid = emailToUserId.get(e);
        if (uid) add(uid, "BE");
      });
    }
    r.project_assignee_emails.forEach((e) => {
      const uid = emailToUserId.get(e);
      if (uid) add(uid, "Project");
    });
  });
  return rows;
}

/** Imports the valid parsed rows. Returns true on success. */
export async function importParsedRows(
  projectId: string,
  tickets: TicketRow[],
  valid: ParsedRow[],
): Promise<boolean> {
  const { epicMap, error: epicErr } = await resolveEpics(projectId, valid);
  if (epicErr) {
    toast.error("Failed to create epics: " + epicErr);
    return false;
  }

  const emailToUserId = await resolveAssigneeEmails(projectId, valid);
  const statusNameToId = await resolveStatusNames(valid);
  const { payload, unknownStatuses } = buildTicketPayload(
    projectId,
    valid,
    tickets,
    epicMap,
    statusNameToId,
  );

  if (unknownStatuses.size > 0) {
    const list = Array.from(unknownStatuses).slice(0, 3).join(", ");
    toast.warning(
      `Unknown Project Status value${unknownStatuses.size === 1 ? "" : "s"}: ${list}${unknownStatuses.size > 3 ? "…" : ""} — defaulted`,
    );
  }

  const { data: createdTickets, error } = await supabase
    .from("tickets")
    .insert(payload as any)
    .select("id");
  if (error || !createdTickets) {
    toast.error(error?.message ?? "Failed to import tickets");
    return false;
  }

  const assigneeRows = buildAssigneeRows(createdTickets as { id: string }[], valid, emailToUserId);
  if (assigneeRows.length > 0) {
    const { error: aErr } = await supabase.from("ticket_assignees").insert(assigneeRows);
    if (aErr) toast.error("Tickets imported, but assignment failed: " + aErr.message);
  }

  toast.success(`Imported ${valid.length} ticket${valid.length === 1 ? "" : "s"}`);
  return true;
}
