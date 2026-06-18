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
}: {
  value: GroupBy;
  onChange: (g: GroupBy) => void;
  label?: string | null;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-dim">{label}</span>}
      <Select value={value} onValueChange={(v) => onChange(v as GroupBy)}>
        <SelectTrigger className={`h-8 text-xs ${className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="status">Status</SelectItem>
          <SelectItem value="assignee">Assignee</SelectItem>
          <SelectItem value="type">Type</SelectItem>
          <SelectItem value="epic">Epic</SelectItem>
          <SelectItem value="version">Version</SelectItem>
          <SelectItem value="fe_status">FE status</SelectItem>
          <SelectItem value="be_status">BE status</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
