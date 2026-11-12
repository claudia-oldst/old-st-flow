import { Button } from "@/components/ui/button";
import { MultiSelectFilter, type MultiOption } from "@/features/_shared/filters/MultiSelectFilter";
import { EMPTY_FILTERS, hasFilters, NO_EPIC, PORTAL_TYPES, type PortalFilters } from "./portalFilters";

interface Props {
  value: PortalFilters;
  onChange: (next: PortalFilters) => void;
  epics: Array<{ id: number; epic_name: string | null }>;
  versions: MultiOption[];
}

/** Empty selection means "All"; ticking every option collapses back to All. */
function AllFilter({ label, options, selected, onChange }: {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <MultiSelectFilter
      label={label}
      options={options}
      selected={selected.length ? selected : options.map((o) => o.value)}
      onChange={(next) => onChange(next.length === options.length ? [] : next)}
      searchable={options.length > 8}
    />
  );
}

export function PortalFilterBar({ value, onChange, epics, versions }: Props) {
  const epicOptions: MultiOption[] = [
    ...epics.map((e) => ({ value: String(e.id), label: e.epic_name ?? "Untitled epic" })),
    { value: String(NO_EPIC), label: "No Epic" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <AllFilter
        label="Type"
        options={PORTAL_TYPES.map((t) => ({ ...t }))}
        selected={value.types}
        onChange={(types) => onChange({ ...value, types })}
      />
      <AllFilter
        label="Epic"
        options={epicOptions}
        selected={value.epics.map(String)}
        onChange={(e) => onChange({ ...value, epics: e.map(Number) })}
      />
      {versions.length > 1 && (
        <AllFilter
          label="Version"
          options={versions}
          selected={value.versions}
          onChange={(v) => onChange({ ...value, versions: v })}
        />
      )}
      {hasFilters(value) && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear
        </Button>
      )}
    </div>
  );
}
