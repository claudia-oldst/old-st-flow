import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ParentRowInfo {
  formatted_id: string;
  title: string;
  ticket_type: string;
  epicName: string | null;
  statusName: string | null;
  statusColor: string | null;
}

export function ParentOptionRow({ info, selected }: { info: ParentRowInfo; selected: boolean }) {
  return (
    <div className="flex items-start gap-2 w-full min-w-0">
      <Check className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <div className="min-w-0 flex-1">
        <div className="flex gap-2">
          <span className="font-mono text-dimmer text-xs shrink-0 pt-px">{info.formatted_id}</span>
          <span className="line-clamp-2 text-sm leading-snug">{info.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{info.ticket_type}</Badge>
          <span className="truncate">{info.epicName ?? "No Epic"}</span>
          {info.statusName && (
            <span className="ml-auto flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.statusColor ?? undefined }} />
              {info.statusName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
