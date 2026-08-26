import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { usePortalPreview } from "@/features/client-portal/usePortalData";
import { ClientReportDocument } from "@/features/client-portal/report/ClientReportDocument";
import "@/features/client-portal/report/report.css";

/**
 * Standalone, print-ready client report. Opened from the client portal editor
 * with the same "as of" date and version scope as the preview.
 */
export default function ProjectReport() {
  const { id = "" } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const role = useProjectRole(id);
  const canView = isPMBA(role);

  const asOfParam = params.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : new Date();
  const versions = (params.get("versions") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    supabase
      .from("projects")
      .select("client_portal_hash")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setHash(data?.client_portal_hash ?? null));
  }, [id]);

  const { data: payload, loading } = usePortalPreview(id, hash, asOf, versions);

  useEffect(() => {
    if (payload) document.title = `${payload.project.name} — client report`;
  }, [payload]);

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-dim">
        Only PM/BA users can view the client report.
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="report-no-print max-w-[900px] mx-auto mb-6 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-wider text-dimmer">
          Client report · edit any text below, then print to PDF
        </div>
        <Button size="sm" onClick={() => window.print()} className="gap-2 text-xs">
          <Printer className="h-3.5 w-3.5" />
          Print / Save as PDF
        </Button>
      </div>

      {payload ? (
        <ClientReportDocument
          payload={payload}
          publicUrl={hash ? `${window.location.origin}/h/${hash}` : null}
        />
      ) : (
        <div className="text-sm text-dim text-center py-24">
          {loading ? "Building report…" : "No report data available."}
        </div>
      )}
    </div>
  );
}
