import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectFilter, type MultiOption } from "@/features/_shared/filters/MultiSelectFilter";
import { TicketSearchInput } from "@/features/_shared/ai-search/TicketSearchInput";
import type { AiTicketSearch } from "@/features/_shared/ai-search/useAiTicketSearch";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import type { RoadmapFilters } from "./roadmapFilters";
import { GROUP_LABEL, type GroupBy } from "./roadmapGroups";
import { SprintColumnsPicker } from "./SprintColumnsPicker";
import type { SprintLite } from "./cellRules";

interface Props {
  search: string;
  setSearch: (s: string) => void;
  ai: AiTicketSearch;
  getCandidates: () => TicketRow[];
  filters: RoadmapFilters;
  setFilters: (f: RoadmapFilters) => void;
  options: { epics: MultiOption[]; types: MultiOption[]; statuses: MultiOption[]; assignees: MultiOption[] };
  sprints: SprintLite[];
  working: SprintLite | undefined;
  previous: SprintLite | undefined;
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  cols: string[];
  setCols: (ids: string[] | null) => void;
  onCollapseAll: (collapse: boolean) => void;
}

const DISC_OPTS: MultiOption[] = [
  ...Object.entries(DISCIPLINE_STATUS_LABEL).map(([value, label]) => ({ value, label })),
  { value: "-", label: "No hours" },
];

export function RoadmapToolbar(p: Props) {
  const f = p.filters;
  const set = (patch: Partial<RoadmapFilters>) => p.setFilters({ ...f, ...patch });
  const sprintOpts: MultiOption[] = [
    ...(p.previous ? [{ value: "unfinished", label: `Unfinished from S${p.previous.sprint_number}` }] : []),
    { value: "not_planned", label: "Not planned" },
    ...p.sprints.flatMap((s) => [
      { value: `planned:${s.id}`, label: `Planned S${s.sprint_number}` },
      { value: `committed:${s.id}`, label: `Committed S${s.sprint_number}` },
      { value: `unplanned:${s.id}`, label: `Unplanned S${s.sprint_number}` },
    ]),
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <TicketSearchInput search={p.search} setSearch={p.setSearch} ai={p.ai} getCandidates={p.getCandidates} />
        <MultiSelectFilter filterStyle label="Epic" options={p.options.epics} selected={f.epics} onChange={(v) => set({ epics: v })} searchable />
        <MultiSelectFilter filterStyle label="Type" options={p.options.types} selected={f.types} onChange={(v) => set({ types: v })} />
        <MultiSelectFilter filterStyle label="Status" options={p.options.statuses} selected={f.statuses} onChange={(v) => set({ statuses: v })} />
        <MultiSelectFilter filterStyle label="FE status" options={DISC_OPTS} selected={f.feStatuses} onChange={(v) => set({ feStatuses: v })} />
        <MultiSelectFilter filterStyle label="BE status" options={DISC_OPTS} selected={f.beStatuses} onChange={(v) => set({ beStatuses: v })} />
        <MultiSelectFilter filterStyle label="Assignee" options={p.options.assignees} selected={f.assignees} onChange={(v) => set({ assignees: v })} searchable />
        <MultiSelectFilter filterStyle label="Sprint" options={sprintOpts} selected={f.sprint} onChange={(v) => set({ sprint: v })} searchable />
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-dimmer">Group by</span>
        <Select value={p.groupBy} onValueChange={(v) => p.setGroupBy(v as GroupBy)}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => <SelectItem key={g} value={g} className="text-xs">{GROUP_LABEL[g]}</SelectItem>)}
          </SelectContent>
        </Select>
        <SprintColumnsPicker sprints={p.sprints} workingId={p.working?.id} cols={p.cols} setCols={p.setCols} />
        <label className="flex items-center gap-1.5 text-dim"><Switch checked={f.showDevDone} onCheckedChange={(v) => set({ showDevDone: v })} /> Show Dev done</label>
        <label className="flex items-center gap-1.5 text-dim"><Switch checked={f.showProj} onCheckedChange={(v) => set({ showProj: v })} /> Show Proj</label>
        {p.groupBy !== "none" && (
          <span className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => p.onCollapseAll(true)}>Collapse all</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => p.onCollapseAll(false)}>Expand all</Button>
          </span>
        )}
      </div>
    </div>
  );
}
