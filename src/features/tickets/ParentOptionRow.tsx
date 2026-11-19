import { Check } from "lucide-react";
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
    <div className="flex items-center gap-2 w-full min-w-0">
      <Check className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <span className="font-mono text-dimmer text-xs shrink-0">{info.formatted_id}</span>
      <span className="truncate text-sm">{info.title}</span>
    </div>
  );
}
