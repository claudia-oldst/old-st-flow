import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, TrendingUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { cn } from "@/lib/utils";
import { ALL_EPICS_KEY } from "./estimate-evolution/dateUtils";
import { EpicRow } from "./estimate-evolution/EpicRow";
import { useEstimateEvolution } from "./estimate-evolution/useEstimateEvolution";
import { EstimateTrendChart } from "./estimate-evolution/EstimateTrendChart";

export function EstimateEvolution({ projectId }: { projectId: string }) {
  const { epics } = useProjectEpics(projectId);
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [selectedEpic, setSelectedEpic] = useState<string>(ALL_EPICS_KEY);
  const [epicsOpen, setEpicsOpen] = useState(false);

  const { epicSnapshots, trendData } = useEstimateEvolution({
    projectId,
    asOf,
    selectedEpic,
    epics,
  });

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-dim" />
          <div className="text-xs uppercase tracking-wider text-dimmer">
            Estimate evolution by epic
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              As of {format(asOf, "d MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={asOf}
              onSelect={(d) => d && setAsOf(d)}
              disabled={(d) => d > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {epicSnapshots.length === 0 ? (
        <div className="text-sm text-dim py-6 text-center">
          No tickets exist on this date yet.
        </div>
      ) : (
        <Collapsible open={epicsOpen} onOpenChange={setEpicsOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02] hairline hover:bg-white/[0.04] transition-colors">
            <span className="text-xs uppercase tracking-wider text-dimmer">
              {epicsOpen ? "Hide" : "Show"} epics ({epicSnapshots.length})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-dim transition-transform",
                epicsOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <div className="space-y-3 pt-3">
              {epicSnapshots.map((g) => (
                <EpicRow key={g.key} {...g} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <EstimateTrendChart
        trendData={trendData}
        selectedEpic={selectedEpic}
        setSelectedEpic={setSelectedEpic}
        epics={epics}
      />
    </div>
  );
}
