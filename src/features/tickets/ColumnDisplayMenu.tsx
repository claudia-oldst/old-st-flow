import { Columns3, Check, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ColumnDisplayPrefs,
  TOGGLEABLE_COLS,
  isAllColsOn,
} from "./useColumnDisplayPrefs";

export function ColumnDisplayMenu({
  prefs,
  onChange,
  onReset,
}: {
  prefs: ColumnDisplayPrefs;
  onChange: (next: ColumnDisplayPrefs) => void;
  onReset: () => void;
}) {
  const allOn = isAllColsOn(prefs);
  const hiddenCount = TOGGLEABLE_COLS.filter((c) => prefs[c.key] === false).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 w-8 p-0 relative",
            !allOn && "border-accent/40 bg-accent/5",
          )}
          title="Column display"
          aria-label="Column display preferences"
        >
          <Columns3 className="h-3.5 w-3.5" />
          {!allOn && (
            <span
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent"
              aria-label={`${hiddenCount} hidden`}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-0 glass-strong"
        sideOffset={6}
      >
        <div className="p-2">
          <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1">
            Columns
          </div>
          <div className="space-y-0.5">
            {TOGGLEABLE_COLS.map((col) => {
              const selected = prefs[col.key] !== false;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => onChange({ ...prefs, [col.key]: !selected })}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition",
                    "hover:bg-white/[0.04]",
                    selected && "bg-white/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition",
                      selected
                        ? "bg-foreground border-foreground text-background"
                        : "border-white/20",
                    )}
                  >
                    {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{col.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {!allOn && (
          <div className="p-2 border-t border-white/5 flex justify-end">
            <button
              onClick={onReset}
              className="text-xs text-dim hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
