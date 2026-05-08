import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-2">
      <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
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
