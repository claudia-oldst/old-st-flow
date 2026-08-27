import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { parseDiscipline, parseEmails, parseType, type ParsedRow } from "./parsers";

/**
 * Maps raw CSV records to ParsedRow[]. Returns null when the required Title
 * column is absent (caller surfaces the error).
 */
export function parseCsvRows(
  data: Record<string, string>[],
  cols: string[],
  tickets: TicketRow[],
): ParsedRow[] | null {
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
  const projStatusCol = findCol("Project Status", "Proj Status", "Status");
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

  if (!titleCol) return null;

  const existingNums = new Set(tickets.map((t) => t.ticket_number));
  const ticketsByNum = new Map(tickets.map((t) => [t.ticket_number, t]));
  const seenNums = new Map<number, number>();

  return data.map((r, idx) => {
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
    const project_status_name = projStatusCol ? (r[projStatusCol] ?? "").trim() : "";
    const acceptance_criteria = acCol ? (r[acCol] ?? "").trim() : "";
    const fe_assignee_emails = parseEmails(feAssigneeCol ? r[feAssigneeCol] : undefined);
    const be_assignee_emails = parseEmails(beAssigneeCol ? r[beAssigneeCol] : undefined);
    const project_assignee_emails = parseEmails(projAssigneeCol ? r[projAssigneeCol] : undefined);

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
        } else if (type === "Proj") {
          parentError = `Proj rows cannot have a parent`;
        } else {
          const parent = ticketsByNum.get(n)!;
          if (parent.ticket_type !== "Standard" && parent.ticket_type !== "CR") {
            parentError = `Parent must be Standard or CR (got ${parent.ticket_type})`;
          } else {
            parent_ticket_number = n;
          }
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
      project_status_name,
      acceptance_criteria,
      fe_assignee_emails,
      be_assignee_emails,
      project_assignee_emails,
      parent_ticket_number,
      error: !titleRaw ? "Missing title" : numError ?? parentError,
    };
  });
}
