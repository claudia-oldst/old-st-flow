import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsible filter group: title row toggles the options below it. */
export function FilterSection({
  title,
  count = 0,
  children,
}: {
  title: string;
  /** Number of selected options in this group; shown when the group is collapsed. */
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition",
          "text-[10px] uppercase tracking-wider hover:text-foreground",
          count > 0 ? "text-foreground" : "text-dimmer"
        )}
      >
        <ChevronRight
          className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span className="truncate">{title}</span>
        {count > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-foreground text-background text-[10px] font-mono">
            {count}
          </span>
        )}
      </button>
      {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

export function FilterRow({
  label,
  selected,
  onClick,
  dot,
  muted,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  dot?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition",
        "hover:bg-white/[0.04]",
        selected && "bg-white/[0.04]"
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition",
          selected
            ? "bg-foreground border-foreground text-background"
            : "border-white/20"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {dot && (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
      )}
      <span className={cn("truncate", muted && "text-dim")}>{label}</span>
    </button>
  );
}
