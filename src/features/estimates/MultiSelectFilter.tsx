import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}

export function MultiSelectFilter({ label, options, selected, onChange, searchable }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [q, options]);

  const allSelected = selected.length === options.length;
  const summary =
    selected.length === 0
      ? "None"
      : allSelected
      ? "All"
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? "1"
      : `${selected.length} selected`;

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
          <span className="text-dimmer">{label}:</span>
          <span className="text-foreground">{summary}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2 glass-strong">
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-dimmer">{label}</span>
          <div className="flex items-center gap-1">
            <button
              className="text-[10px] text-dim hover:text-foreground transition"
              onClick={() => onChange(options.map((o) => o.value))}
            >
              All
            </button>
            <span className="text-dimmer">·</span>
            <button
              className="text-[10px] text-dim hover:text-foreground transition"
              onClick={() => onChange([])}
            >
              None
            </button>
          </div>
        </div>
        {searchable && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-7 text-xs mb-1"
          />
        )}
        <div className="max-h-64 overflow-auto space-y-0.5">
          {filtered.length === 0 && (
            <div className="text-xs text-dim px-2 py-3 text-center">No matches</div>
          )}
          {filtered.map((o) => {
            const isSel = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => toggle(o.value)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-white/5 transition text-left"
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center",
                    isSel
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-white/20"
                  )}
                >
                  {isSel && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
