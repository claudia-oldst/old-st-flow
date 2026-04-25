import { DISCIPLINE_STATUS_COLOR, DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DisciplineStatusChip({
  slot,
  status,
  size = "xs",
  className,
}: {
  slot: "FE" | "BE";
  status: DisciplineStatus;
  size?: "xs" | "sm";
  className?: string;
}) {
  const color = DISCIPLINE_STATUS_COLOR[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full ring-1 ring-white/10",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      style={{ background: `${color}1f`, color }}
    >
      <span className="font-semibold">{slot}</span>
      <span className="opacity-80">·</span>
      <span>{DISCIPLINE_STATUS_LABEL[status]}</span>
    </span>
  );
}
