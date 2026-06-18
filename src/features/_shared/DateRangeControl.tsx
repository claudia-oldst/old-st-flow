import { useState } from "react";
import { format, startOfMonth, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };

const PRESETS: Array<{ label: string; get: () => DateRange }> = [
  { label: "7d", get: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "14d", get: () => ({ from: startOfDay(subDays(new Date(), 13)), to: endOfDay(new Date()) }) },
  { label: "30d", get: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Month", get: () => ({ from: startOfDay(startOfMonth(new Date())), to: endOfDay(new Date()) }) },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function defaultRange(): DateRange {
  return PRESETS[0].get();
}

export function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [activePreset, setActivePreset] = useState<string | null>("7d");

  const setPreset = (p: typeof PRESETS[number]) => {
    setActivePreset(p.label);
    onChange(p.get());
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-0.5 rounded-md bg-white/[0.03] p-0.5 ring-1 ring-white/5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            className={cn(
              "px-2 py-0.5 text-[10px] uppercase tracking-wider rounded transition",
              activePreset === p.label
                ? "bg-white/10 text-foreground"
                : "text-dimmer hover:text-dim"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <DatePopover
        date={value.from}
        onChange={(d) => {
          setActivePreset(null);
          onChange({ from: startOfDay(d), to: value.to });
        }}
        label="From"
      />
      <span className="text-dimmer text-xs">–</span>
      <DatePopover
        date={value.to}
        onChange={(d) => {
          setActivePreset(null);
          onChange({ from: value.from, to: endOfDay(d) });
        }}
        label="To"
      />
    </div>
  );
}

function DatePopover({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-mono text-dim hover:text-foreground"
          aria-label={label}
        >
          <CalendarIcon className="h-3 w-3 mr-1.5" />
          {format(date, "MMM d")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
