import type { TicketType } from "@/lib/types";

export type DisciplineStatus = "todo" | "in_progress" | "done";

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

export function parseType(raw: string | undefined): TicketType {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "bug") return "Bug";
  if (v === "cr" || v === "change request" || v === "changerequest") return "CR";
  if (v === "proj" || v === "project") return "Proj";
  return "Standard";
}

export function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;|\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function downloadTicketsTemplate() {
  const header =
    "Ticket #,Title,Type,FE Estimate,BE Estimate,Project Estimate,Epic,Version,FE Status,BE Status,Project Status,Parent Ticket #,FE Assignees,BE Assignees,Project Assignees,Acceptance Criteria";
  const rows = [
    // Standard ticket with FE+BE, assignees, AC
    `,Example: build login page,Standard,4,2,,Authentication,v1,todo,todo,,,jane@acme.com,john@acme.com,,"- User can log in with email\\n- Errors shown inline"`,
    // Bug linked to parent ticket #12
    `42,Example: fix header overflow,Bug,1,0,,UI polish,v1,in_progress,todo,,12,jane@acme.com,,,`,
    // Standard sub-ticket of #12 (split work under a Standard/CR parent)
    `,Example: auth API surface (sub-ticket),Standard,2,3,,Authentication,v1,todo,todo,,12,john@acme.com,,,`,
    // CR with BE work only, two BE assignees
    `,Example: add export endpoint,CR,0,3,,Reporting,v2,todo,done,,,,"john@acme.com,sara@acme.com",,`,
    // Proj-type ticket (uses Project Estimate, Project Status, Project Assignees; FE/BE blank)
    `,Example: client kickoff workshop,Proj,,,8,Discovery,v1,,,In Progress,,,,pm@acme.com,`,
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
