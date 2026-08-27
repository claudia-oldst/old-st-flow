import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { parseCsvRows } from "./csv/parseCsvRows";
import { importParsedRows } from "./csv/importTickets";
import type { ParsedRow } from "./csv/parsers";

export type { ParsedRow } from "./csv/parsers";
export { parseDiscipline, downloadTicketsTemplate } from "./csv/parsers";

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
        const parsed = parseCsvRows(res.data, res.meta.fields ?? [], tickets);
        if (!parsed) {
          toast.error("CSV must include a Title column");
          setFileName(null);
          return;
        }
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
    const ok = await importParsedRows(projectId, tickets, valid);
    setImporting(false);
    if (!ok) return false;
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
