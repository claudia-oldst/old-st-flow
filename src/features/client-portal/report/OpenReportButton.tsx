import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the printable, editable client report for the current cutoff/version
 * scope in a new tab.
 */
export function OpenReportButton({
  projectId,
  asOf,
  versions,
  disabled,
}: {
  projectId: string;
  asOf: Date;
  versions: string[];
  disabled?: boolean;
}) {
  function open() {
    const params = new URLSearchParams({ asOf: asOf.toISOString() });
    if (versions.length) params.set("versions", versions.join(","));
    window.open(`/projects/${projectId}/report?${params.toString()}`, "_blank");
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={open}
      className="h-6 px-2 gap-1.5 text-[10px] uppercase tracking-wider text-dimmer hover:text-foreground"
    >
      <FileText className="h-3 w-3" />
      Report
    </Button>
  );
}
