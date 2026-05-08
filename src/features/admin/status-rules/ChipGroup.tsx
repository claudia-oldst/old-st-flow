import type { DisciplineStatus } from "@/lib/types";

export const DISC_OPTIONS: { value: DisciplineStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "for_integration", label: "For integration" },
  { value: "done", label: "Done" },
];

interface ChipGroupProps {
  value: DisciplineStatus[];
  onChange: (v: DisciplineStatus[]) => void;
  disabled?: boolean;
}

export function ChipGroup({ value, onChange, disabled }: ChipGroupProps) {
  const toggle = (s: DisciplineStatus) => {
    if (disabled) return;
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {DISC_OPTIONS.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-full text-xs ring-1 transition ${
              active
                ? "bg-primary/15 text-primary ring-primary/40"
                : "bg-white/[0.02] text-dim ring-white/10 hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
      {value.length === 0 && (
        <span className="text-xs text-dimmer self-center pl-1">any</span>
      )}
    </div>
  );
}
