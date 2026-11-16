import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ticketLabel, ticketLinkHtml, ticketUrl } from "./ticketLink";

export function CopyTicketLinkButton({
  projectId, ticketId, formattedId, title,
}: { projectId: string; ticketId: string; formattedId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = ticketUrl(window.location.origin, projectId, ticketId);
    const label = ticketLabel(formattedId, title);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([ticketLinkHtml(url, label)], { type: "text/html" }),
            "text/plain": new Blob([`${label}\n${url}`], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try { await navigator.clipboard.writeText(url); } catch { return toast.error("Couldn't copy link"); }
    }
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button size="sm" variant="ghost" onClick={copy} className="h-7 w-7 p-0 text-dim hover:text-foreground"
      aria-label="Copy ticket link" title="Copy ticket link">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
