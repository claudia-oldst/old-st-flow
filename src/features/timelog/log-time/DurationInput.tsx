import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatHours } from "@/lib/utils";
import { hoursMinutesToDecimal } from "../utils";

interface Props {
  h: string;
  m: string;
  onChange: (h: string, m: string) => void;
  invalid?: boolean;
  label?: string;
}

export function DurationInput({ h, m, onChange, invalid, label = "Duration" }: Props) {
  const decimal = hoursMinutesToDecimal(h, m);
  const showPreview = h !== "" || m !== "";

  const clampMinutes = (v: string) => {
    if (v === "") return "";
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return "";
    if (n < 0) return "0";
    if (n > 59) return "59";
    return String(n);
  };

  const clampHours = (v: string) => {
    if (v === "") return "";
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return "";
    if (n < 0) return "0";
    return String(n);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={h}
          onChange={(e) => onChange(e.target.value, m)}
          onBlur={(e) => onChange(clampHours(e.target.value), m)}
          placeholder="0"
          aria-label="Hours"
          className={cn("w-20 text-center", invalid && "border-primary focus-visible:ring-primary")}
        />
        <span className="text-sm text-dim">h</span>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          max="59"
          step="5"
          value={m}
          onChange={(e) => onChange(h, e.target.value)}
          onBlur={(e) => onChange(h, clampMinutes(e.target.value))}
          placeholder="0"
          aria-label="Minutes"
          className={cn("w-20 text-center", invalid && "border-primary focus-visible:ring-primary")}
        />
        <span className="text-sm text-dim">m</span>
        {showPreview && decimal > 0 && (
          <span className="ml-2 text-[11px] font-mono text-dimmer">= {formatHours(decimal)}</span>
        )}
      </div>
    </div>
  );
}
