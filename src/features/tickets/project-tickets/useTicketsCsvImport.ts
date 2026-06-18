import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { TicketType } from "@/lib/types";

type DisciplineStatus = "todo" | "in_progress" | "done";

export interface ParsedRow {
  title: string;
  type: TicketType;
  ticket_number: number | null;
  fe: number;
  be: number;
  proj: number;
  epic: string;
  version: string;
  fe_status: DisciplineStatus;
  be_status: DisciplineStatus;
  project_status_name: string;
  acceptance_criteria: string;
  fe_assignee_emails: string[];
  be_assignee_emails: string[];
  project_assignee_emails: string[];
  parent_ticket_number: number | null;
  error?: string;
}

export function parseDiscipline(raw: string | undefined): DisciplineStatus {
  const v = (raw ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (v === "done" || v === "complete" || v === "completed") return "done";
  if (v === "inprogress" || v === "doing" || v === "active" || v === "wip")
    return "in_progress";
  return "todo";
}

function parseType(raw: string | undefined): TicketType {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "bug") return "Bug";
  if (v === "cr" || v === "change request" || v === "changerequest") return "CR";
  if (v === "proj" || v === "project") return "Proj";
  return "Standard";
}

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;|\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function downloadTicketsTemplate() {
  const header =
    "Ticket #,Title,Type,FE Estimate,BE Estimate,Project Estimate,Epic,Version,FE Status,BE Status,Parent Ticket #,FE Assignees,BE Assignees,Project Assignees,Acceptance Criteria";
  const rows = [
    // Standard ticket with FE+BE, assignees, AC
    `,Example: build login page,Standard,4,2,,Authentication,v1,todo,todo,,jane@acme.com,john@acme.com,,"- User can log in with email\\n- Errors shown inline"`,
    // Bug linked to parent ticket #12
    `42,Example: fix header overflow,Bug,1,0,,UI polish,v1,in_progress,todo,12,jane@acme.com,,,`,
    // CR with BE work only, two BE assignees
    `,Example: add export endpoint,CR,0,3,,Reporting,v2,todo,done,,,"john@acme.com,sara@acme.com",,`,
    // Proj-type ticket (uses Project Estimate + Project Assignees; FE/BE blank)
    `,Example: client kickoff workshop,Proj,,,8,Discovery,v1,,,,,,pm@acme.com,`,
  ];
  const csv = [header, ...rows].join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tickets-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useTicketsCsvImport(
  projectId: string,
  tickets: TicketRow[],
  onImported: () => void,
) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName(null);
    setDragOver(false);
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        const findCol = (...keys: string[]) =>
          cols.find((c) => keys.some((k) => c.trim().toLowerCase() === k.toLowerCase())) ?? null;
        const numberCol = findCol("Ticket #", "Ticket Number", "Number", "#", "ID", "Ticket ID");
        const titleCol = findCol("Title", "Name");
        const typeCol = findCol("Type");
        const feCol = findCol("FE Estimate", "FE", "Frontend");
        const beCol = findCol("BE Estimate", "BE", "Backend");
        const projCol = findCol("Project Estimate", "Proj Estimate", "Proj", "Project");
        const epicCol = findCol("Epic", "Epic Name");
        const versionCol = findCol("Version", "Phase");
        const feStatusCol = findCol("FE Status", "Frontend Status");
        const beStatusCol = findCol("BE Status", "Backend Status");
        const acCol = findCol("Acceptance Criteria", "acceptance_criteria", "AC", "Acceptance");
        const feAssigneeCol = findCol("FE Assignees", "FE Assignee", "Frontend Assignees");
        const beAssigneeCol = findCol("BE Assignees", "BE Assignee", "Backend Assignees");
        const projAssigneeCol = findCol(
          "Project Assignees",
          "Project Assignee",
          "Proj Assignees",
          "Assignees",
        );
        const parentCol = findCol("Parent Ticket #", "Parent #", "Parent", "Parent Ticket");

        if (!titleCol) {
          toast.error("CSV must include a Title column");
          setFileName(null);
          return;
        }

        const existingNums = new Set(tickets.map((t) => t.ticket_number));
        const ticketsByNum = new Map(tickets.map((t) => [t.ticket_number, t]));
        const seenNums = new Map<number, number>();

        const parsed: ParsedRow[] = res.data.map((r, idx) => {
          const titleRaw = (r[titleCol] ?? "").trim();
          const type = parseType(typeCol ? r[typeCol] : undefined);
          const isProj = type === "Proj";
          const fe = feCol && !isProj ? parseFloat(r[feCol]) || 0 : 0;
          const be = beCol && !isProj ? parseFloat(r[beCol]) || 0 : 0;
          const proj = projCol && isProj ? parseFloat(r[projCol]) || 0 : 0;
          const epic = epicCol ? (r[epicCol] ?? "").trim() : "";
          const version = versionCol ? (r[versionCol] ?? "").trim() : "";
          const fe_status = parseDiscipline(feStatusCol ? r[feStatusCol] : undefined);
          const be_status = parseDiscipline(beStatusCol ? r[beStatusCol] : undefined);
          const acceptance_criteria = acCol ? (r[acCol] ?? "").trim() : "";
          const fe_assignee_emails = parseEmails(feAssigneeCol ? r[feAssigneeCol] : undefined);
          const be_assignee_emails = parseEmails(beAssigneeCol ? r[beAssigneeCol] : undefined);
          const project_assignee_emails = parseEmails(
            projAssigneeCol ? r[projAssigneeCol] : undefined,
          );

          let ticket_number: number | null = null;
          let numError: string | undefined;
          if (numberCol) {
            const raw = (r[numberCol] ?? "").trim();
            if (raw) {
              const m = raw.match(/(\d+)\s*$/);
              const n = m ? parseInt(m[1], 10) : NaN;
              if (!Number.isFinite(n) || n <= 0) {
                numError = `Invalid ticket #: "${raw}"`;
              } else if (existingNums.has(n)) {
                numError = `Ticket #${n} already exists`;
              } else if (seenNums.has(n)) {
                numError = `Duplicate ticket # in CSV`;
              } else {
                ticket_number = n;
                seenNums.set(n, idx);
              }
            }
          }

          let parent_ticket_number: number | null = null;
          let parentError: string | undefined;
          if (parentCol) {
            const raw = (r[parentCol] ?? "").trim();
            if (raw) {
              const m = raw.match(/(\d+)\s*$/);
              const n = m ? parseInt(m[1], 10) : NaN;
              if (!Number.isFinite(n) || n <= 0) {
                parentError = `Invalid parent #: "${raw}"`;
              } else if (!ticketsByNum.has(n)) {
                parentError = `Parent #${n} not found`;
              } else if (type !== "Bug") {
                parentError = `Parent only valid for Bug rows`;
              } else {
                parent_ticket_number = n;
              }
            }
          }

          return {
            title: titleRaw,
            type,
            ticket_number,
            fe,
            be,
            proj,
            epic,
            version,
            fe_status,
            be_status,
            acceptance_criteria,
            fe_assignee_emails,
            be_assignee_emails,
            project_assignee_emails,
            parent_ticket_number,
            error: !titleRaw ? "Missing title" : numError ?? parentError,
          };
        });
        setRows(parsed);
      },
      error: (err) => {
        toast.error("Failed to parse CSV: " + err.message);
        setFileName(null);
      },
    });
  };

  const handleImport = async (): Promise<boolean> => {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return false;
    }
    setImporting(true);

    // Epics
    const epicNames = Array.from(
      new Set(valid.map((r) => r.epic.trim()).filter(Boolean))
    );
    const epicMap = new Map<string, number>();

    if (epicNames.length > 0) {
      const { data: existing } = await supabase
        .from("project_epics")
        .select("id, epic_name")
        .eq("project_id", projectId);
      (existing ?? []).forEach((e: any) => {
        if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
      });

      const toCreate = epicNames.filter((n) => !epicMap.has(n.toLowerCase()));
      if (toCreate.length > 0) {
        const { data: created, error: epicErr } = await supabase
          .from("project_epics")
          .insert(toCreate.map((name) => ({ project_id: projectId, epic_name: name })))
          .select("id, epic_name");
        if (epicErr) {
          setImporting(false);
          toast.error("Failed to create epics: " + epicErr.message);
          return false;
        }
        (created ?? []).forEach((e: any) => {
          if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
        });
      }
    }

    // Project members → email → user_id
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
    const unknownEmails = Array.from(allEmails).filter((e) => !emailToUserId.has(e));
    if (unknownEmails.length > 0) {
      toast.warning(
        `Skipped ${unknownEmails.length} unknown assignee email${unknownEmails.length === 1 ? "" : "s"}: ${unknownEmails.slice(0, 3).join(", ")}${unknownEmails.length > 3 ? "…" : ""}`,
      );
    }

    // Parent map: ticket_number → id
    const parentNumToId = new Map<number, string>();
    tickets.forEach((t) => parentNumToId.set(t.ticket_number, t.id));

    // Ticket numbers
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

    const payload = valid.map((r) => {
      const isProj = r.type === "Proj";
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
        epic_id: r.epic.trim() ? epicMap.get(r.epic.trim().toLowerCase()) ?? null : null,
        version: r.version.trim() || null,
        acceptance_criteria: r.acceptance_criteria.trim() || null,
        parent_ticket_id:
          r.type === "Bug" && r.parent_ticket_number != null
            ? parentNumToId.get(r.parent_ticket_number) ?? null
            : null,
        ticket_number: r.ticket_number ?? nextFree(),
        formatted_id: "",
      };
    });
    const { data: createdTickets, error } = await supabase
      .from("tickets")
      .insert(payload as any)
      .select("id");
    if (error || !createdTickets) {
      setImporting(false);
      toast.error(error?.message ?? "Failed to import tickets");
      return false;
    }

    // Assignees
    const assigneeRows: { ticket_id: string; user_id: string; slot: "FE" | "BE" | "Project" }[] = [];
    createdTickets.forEach((row: any, idx: number) => {
      const r = valid[idx];
      if (!r) return;
      const isProj = r.type === "Proj";
      const seen = new Set<string>();
      const add = (uid: string, slot: "FE" | "BE" | "Project") => {
        const key = `${uid}::${slot}`;
        if (seen.has(key)) return;
        seen.add(key);
        assigneeRows.push({ ticket_id: row.id, user_id: uid, slot });
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
    if (assigneeRows.length > 0) {
      const { error: aErr } = await supabase.from("ticket_assignees").insert(assigneeRows);
      if (aErr) {
        toast.error("Tickets imported, but assignment failed: " + aErr.message);
      }
    }

    setImporting(false);
    toast.success(`Imported ${valid.length} ticket${valid.length === 1 ? "" : "s"}`);
    reset();
    onImported();
    return true;
  };

  return {
    rows,
    fileName,
    dragOver,
    setDragOver,
    importing,
    reset,
    handleFile,
    handleImport,
  };
}
