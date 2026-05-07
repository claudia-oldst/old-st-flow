import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { TicketType } from "@/lib/types";

export interface ParsedRow {
  title: string;
  type: TicketType;
  ticket_number: number | null;
  fe: number;
  be: number;
  epic: string;
  version: string;
  fe_status: "todo" | "in_progress" | "done";
  be_status: "todo" | "in_progress" | "done";
  acceptance_criteria: string;
  error?: string;
}

export function parseDiscipline(raw: string | undefined): "todo" | "in_progress" | "done" {
  const v = (raw ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (v === "done" || v === "complete" || v === "completed") return "done";
  if (v === "inprogress" || v === "doing" || v === "active" || v === "wip")
    return "in_progress";
  return "todo";
}

export function downloadTicketsTemplate() {
  const csv =
    "Ticket #,Title,Type,FE Estimate,BE Estimate,Epic,Version,FE Status,BE Status,Acceptance Criteria\n" +
    ",Example: build login page,Standard,4,2,Authentication,v1,todo,todo,\"- User can log in with email\\n- Errors shown inline\"\n" +
    "42,Example: fix header overflow,Bug,1,0,UI polish,v1,in_progress,todo,\n" +
    ",Example: add export endpoint,CR,0,3,Reporting,v2,todo,done,\n";
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
        const titleCol = findCol("Title", "title", "Name");
        const typeCol = findCol("Type", "type");
        const feCol = findCol("FE Estimate", "FE", "Frontend", "fe estimate");
        const beCol = findCol("BE Estimate", "BE", "Backend", "be estimate");
        const epicCol = findCol("Epic", "epic", "Epic Name");
        const versionCol = findCol("Version", "version", "Phase");
        const feStatusCol = findCol("FE Status", "fe status", "Frontend Status");
        const beStatusCol = findCol("BE Status", "be status", "Backend Status");
        const acCol = findCol("Acceptance Criteria", "acceptance_criteria", "AC", "Acceptance");

        if (!titleCol) {
          toast.error("CSV must include a Title column");
          setFileName(null);
          return;
        }

        const existingNums = new Set(tickets.map((t) => t.ticket_number));
        const seenNums = new Map<number, number>();

        const parsed: ParsedRow[] = res.data.map((r, idx) => {
          const titleRaw = (r[titleCol] ?? "").trim();
          const typeRaw = (typeCol ? r[typeCol] : "Standard").trim();
          let type: TicketType = "Standard";
          const tl = typeRaw.toLowerCase();
          if (tl === "bug") type = "Bug";
          else if (tl === "cr" || tl === "change request") type = "CR";
          const fe = feCol ? parseFloat(r[feCol]) || 0 : 0;
          const be = beCol ? parseFloat(r[beCol]) || 0 : 0;
          const epic = epicCol ? (r[epicCol] ?? "").trim() : "";
          const version = versionCol ? (r[versionCol] ?? "").trim() : "";
          const fe_status = parseDiscipline(feStatusCol ? r[feStatusCol] : undefined);
          const be_status = parseDiscipline(beStatusCol ? r[beStatusCol] : undefined);
          const acceptance_criteria = acCol ? (r[acCol] ?? "").trim() : "";

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

          return {
            title: titleRaw,
            type,
            ticket_number,
            fe,
            be,
            epic,
            version,
            fe_status,
            be_status,
            acceptance_criteria,
            error: !titleRaw ? "Missing title" : numError,
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

      const toCreate = epicNames.filter(
        (n) => !epicMap.has(n.toLowerCase())
      );
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

    const payload = valid.map((r) => ({
      project_id: projectId,
      title: r.title,
      ticket_type: r.type,
      original_fe_estimate: r.fe,
      original_be_estimate: r.be,
      current_fe_estimate: r.fe,
      current_be_estimate: r.be,
      fe_status: r.fe_status,
      be_status: r.be_status,
      epic_id: r.epic.trim() ? epicMap.get(r.epic.trim().toLowerCase()) ?? null : null,
      version: r.version.trim() || null,
      acceptance_criteria: r.acceptance_criteria.trim() || null,
      ticket_number: r.ticket_number ?? nextFree(),
      formatted_id: "",
    }));
    const { error } = await supabase.from("tickets").insert(payload);
    setImporting(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
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
