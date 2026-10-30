import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupBy } from "@/features/tickets/TicketsList";

/** Shared "Group by" dropdown used by ticket toolbars and sprint planning. */
export function GroupBySelect({
  value,
  onChange,
  label = "Group by",
  className = "w-[140px]",
  options,
}: {
  value: GroupBy;
  onChange: (g: GroupBy) => void;
  label?: string | null;
  className?: string;
  /** Restrict the choices; defaults to all. */
  options?: GroupBy[];
}) {
  const show = (g: GroupBy) => !options || options.includes(g);
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-dim">{label}</span>}
      <Select value={value} onValueChange={(v) => onChange(v as GroupBy)}>
        <SelectTrigger className={`h-8 text-xs ${className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {show("none") && <SelectItem value="none">None</SelectItem>}
          {show("status") && <SelectItem value="status">Status</SelectItem>}
          {show("assignee") && <SelectItem value="assignee">Assignee</SelectItem>}
          {show("type") && <SelectItem value="type">Type</SelectItem>}
          {show("epic") && <SelectItem value="epic">Epic</SelectItem>}
          {show("version") && <SelectItem value="version">Version</SelectItem>}
          {show("fe_status") && <SelectItem value="fe_status">FE status</SelectItem>}
          {show("be_status") && <SelectItem value="be_status">BE status</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}
