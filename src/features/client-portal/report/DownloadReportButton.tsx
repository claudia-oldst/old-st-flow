import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import type { PortalPayload } from "../types";
import { buildClientReport, reportFileName, type ReportCR } from "./buildClientReport";

/**
 * Downloads a branded .docx snapshot of the client preview.
 * Uses the payload already rendered on screen — no extra portal queries.
 */
export function DownloadReportButton({
  projectId,
  payload,
  publicUrl,
}: {
  projectId: string;
  payload: PortalPayload | null;
  publicUrl: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const { tickets } = useProjectTickets(projectId);

  async function handleDownload() {
    if (!payload) return;
    setBusy(true);
    try {
      const crs: ReportCR[] = tickets
        .filter(
          (t) =>
            t.ticket_type === "CR" &&
            (t.cr_approval === "pending" || t.cr_approval === "approved"),
        )
        .map((t) => ({
          formatted_id: t.formatted_id,
          title: t.title,
          hours:
            Number(t.current_fe_estimate || 0) +
            Number(t.current_be_estimate || 0) +
            Number(t.current_project_estimate || 0),
          status: t.cr_approval as "pending" | "approved",
          decided_at: t.cr_decided_at,
        }));

      const blob = await buildClientReport({ payload, crs, publicUrl });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(payload.project.acronym, payload.project.cutoff);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Client report downloaded");
    } catch (e) {
      console.error("Client report failed", e);
      toast.error("Could not generate the client report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDownload}
      disabled={!payload || busy}
      className="h-6 px-2 gap-1.5 text-[10px] uppercase tracking-wider text-dimmer hover:text-foreground"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      Download
    </Button>
  );
}
