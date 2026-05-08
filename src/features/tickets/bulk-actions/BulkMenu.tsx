import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  title: string;
  disabled?: boolean;
  width?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}

/** Trigger button + popover used for each menu in the bulk-actions bar. */
export function BulkMenu({
  icon: Icon,
  label,
  title,
  disabled,
  width = "w-56",
  align = "center",
  children,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-1`} align={align} side="top">
        <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1.5">
          {title}
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** A single picker row inside a BulkMenu popover. */
export function BulkMenuRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-white/5 text-left"
    >
      {children}
    </button>
  );
}
