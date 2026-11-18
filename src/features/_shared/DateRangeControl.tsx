import { useState } from "react";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };

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
  return { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) };
}

export function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <DatePopover
        date={value.from}
        onChange={(d) => onChange({ from: startOfDay(d), to: value.to })}
        label="From"
      />
      <span className="text-dimmer text-xs">–</span>
      <DatePopover
        date={value.to}
        onChange={(d) => onChange({ from: value.from, to: endOfDay(d) })}
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
