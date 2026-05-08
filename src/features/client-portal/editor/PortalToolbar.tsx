import { format } from "date-fns";
import { CalendarIcon, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface Props {
  project: Project | null;
  asOf: Date;
  setAsOf: (d: Date) => void;
  hash: string | null;
  busy: boolean;
  onUpdate: () => void;
  onPublish: () => void;
  onDisable: () => void;
}

export function PortalToolbar({
  project,
  asOf,
  setAsOf,
  hash,
  busy,
  onUpdate,
  onPublish,
  onDisable,
}: Props) {
  const portalUrl = hash ? `${window.location.origin}/h/${hash}` : null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="text-xs uppercase tracking-wider text-dimmer">Snapshot</div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <CalendarIcon className="h-3.5 w-3.5" />
            As of {format(asOf, "d MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={asOf}
            onSelect={(d) => d && setAsOf(d)}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {portalUrl ? (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-dimmer">Public link</div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 truncate font-mono text-xs px-2 py-1.5 rounded bg-white/5 hairline">
              {portalUrl}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                toast.success("Copied");
              }}
              aria-label="Copy link"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" asChild aria-label="Open portal">
              <a href={portalUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          {project?.client_summary_updated_at && (
            <div className="text-[10px] text-dimmer">
              Last published{" "}
              {format(new Date(project.client_summary_updated_at), "d MMM yyyy 'at' HH:mm")}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-dim">
          Public link disabled. The client cannot view the URL, but you can still plan what they'd see below. Click "Publish to client" to enable a new link.
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onUpdate} disabled={busy} className="flex-1">
          Update Preview
        </Button>
        <Button size="sm" onClick={onPublish} disabled={busy} className="flex-1">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Publish to client
        </Button>
        {hash && (
          <Button size="sm" variant="ghost" onClick={onDisable}>
            Disable
          </Button>
        )}
      </div>
    </div>
  );
}
