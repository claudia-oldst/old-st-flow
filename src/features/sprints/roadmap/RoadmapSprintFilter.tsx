import { MultiSelectFilter, type MultiOption } from "@/features/_shared/filters/MultiSelectFilter";
import type { SprintLite } from "./cellRules";

/** Roadmap-only sprint filter, shown next to the shared Tickets filter. */
export function RoadmapSprintFilter({ sprints, previous, selected, onChange }: {
  sprints: SprintLite[]; previous: SprintLite | undefined; selected: string[]; onChange: (v: string[]) => void;
}) {
  const opts: MultiOption[] = [
    ...(previous ? [{ value: "unfinished", label: `Unfinished from S${previous.sprint_number}` }] : []),
    { value: "not_planned", label: "Not planned" },
    ...sprints.flatMap((s) => [
      { value: `planned:${s.id}`, label: `Planned S${s.sprint_number}` },
      { value: `committed:${s.id}`, label: `Committed S${s.sprint_number}` },
    ]),
  ];
  return <MultiSelectFilter filterStyle label="Sprint" options={opts} selected={selected} onChange={onChange} searchable />;
}
