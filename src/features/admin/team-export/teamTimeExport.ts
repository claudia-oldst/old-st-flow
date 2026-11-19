import * as XLSX from "xlsx";

export interface ExportLog {
  hours: number;
  logged_at: string;
  logged_tz_offset: number | null;
  user: { name: string; email: string } | null;
  ticket: { formatted_id: string; title: string; ticket_type: string; project: { name: string } | null } | null;
}

export interface ExportRow { project: string; ticket: string; name: string; email: string; hours: number }

/** The logger's local calendar date (yyyy-MM-dd); UTC when no offset stored. */
export function localLogDate(loggedAt: string, offsetMin: number | null): string {
  const ms = new Date(loggedAt).getTime() + (offsetMin ?? 0) * 60000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function aggregateLogs(logs: ExportLog[], from: string, to: string): ExportRow[] {
  const map = new Map<string, ExportRow>();
  for (const l of logs) {
    if (!l.ticket || !l.user || l.ticket.ticket_type === "Feedback") continue;
    const d = localLogDate(l.logged_at, l.logged_tz_offset);
    if (d < from || d > to) continue;
    const project = l.ticket.project?.name ?? "";
    const ticket = `${l.ticket.formatted_id} - ${l.ticket.title}`;
    const key = [l.user.email, project, ticket].join("|");
    const row = map.get(key) ?? { project, ticket, name: l.user.name, email: l.user.email, hours: 0 };
    row.hours += Number(l.hours) || 0;
    map.set(key, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, hours: Math.round(r.hours * 100) / 100 }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.project.localeCompare(b.project) || a.ticket.localeCompare(b.ticket));
}

/** Columns A Project, D Ticket, E Name, G Email, O Logged hours. */
export function buildWorkbook(rows: ExportRow[]): XLSX.WorkBook {
  const line = (p: unknown, t: unknown, n: unknown, e: unknown, h: unknown) => {
    const r: unknown[] = new Array(15).fill(null);
    r[0] = p; r[3] = t; r[4] = n; r[6] = e; r[14] = h;
    return r;
  };
  const aoa = [line("Project", "Ticket", "Name", "Email", "Logged Hours"), ...rows.map((r) => line(r.project, r.ticket, r.name, r.email, r.hours))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = Array.from({ length: 15 }, (_, i) => ({ wch: [0, 3].includes(i) ? 36 : [4, 6].includes(i) ? 26 : i === 14 ? 14 : 4 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Team time");
  return wb;
}
