import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import type { TicketFilters } from "./applyFilters";
import { DISC_OPTS, HEALTH_OPTS, TYPE_OPTS } from "./constants";
import { FilterRow, FilterSection as FilterSectionPrimitive } from "./FilterPrimitives";
import type { FilterSection } from "../TicketsFilter";

/** The scrollable body of the tickets filter popover. */
export function FilterSections({
  projectId,
  sections,
  filters,
  toggle,
  assigneeOptions,
  versionOptions,
}: {
  projectId: string;
  sections: FilterSection[];
  filters: TicketFilters;
  toggle: (key: keyof TicketFilters, value: string) => void;
  assigneeOptions: { id: string; name: string; color: string }[];
  versionOptions: string[];
}) {
  const { statuses } = useStatuses();
  const { epics } = useProjectEpics(projectId);
  return (
    <div className="max-h-[70vh] overflow-y-auto divide-y divide-white/5">
            {sections.includes("type") && (
              <FilterSectionPrimitive title="Type">
                {TYPE_OPTS.map((tp) => (
                  <FilterRow
                    key={tp}
                    label={tp === "Proj" ? "Project" : tp}
                    selected={filters.types.includes(tp)}
                    onClick={() => toggle("types", tp)}
                  />
                ))}
              </FilterSectionPrimitive>
            )}

            {sections.includes("status") && (
              <FilterSectionPrimitive title="Status">
                {statuses.map((s) => (
                  <FilterRow
                    key={s.id}
                    label={s.name}
                    dot={s.color}
                    selected={filters.statusIds.includes(s.id)}
                    onClick={() => toggle("statusIds", s.id)}
                  />
                ))}
              </FilterSectionPrimitive>
            )}

            {sections.includes("fe_status") && (
              <FilterSectionPrimitive title="Dev status — Frontend">
                {DISC_OPTS.map((s) => (
                  <FilterRow
                    key={s}
                    label={DISCIPLINE_STATUS_LABEL[s]}
                    selected={filters.feStatuses.includes(s)}
                    onClick={() => toggle("feStatuses", s)}
                  />
                ))}
              </FilterSectionPrimitive>
            )}

            {sections.includes("be_status") && (
              <FilterSectionPrimitive title="Dev status — Backend">
                {DISC_OPTS.map((s) => (
                  <FilterRow
                    key={s}
                    label={DISCIPLINE_STATUS_LABEL[s]}
                    selected={filters.beStatuses.includes(s)}
                    onClick={() => toggle("beStatuses", s)}
                  />
                ))}
              </FilterSectionPrimitive>
            )}

            {sections.includes("health") && (
              <FilterSectionPrimitive title="Estimate vs actual">
                {HEALTH_OPTS.map((h) => (
                  <FilterRow
                    key={h.value}
                    label={h.label}
                    dot={h.dot}
                    selected={filters.health.includes(h.value)}
                    onClick={() => toggle("health", h.value)}
                  />
                ))}
              </FilterSectionPrimitive>
            )}

            {sections.includes("epic") && (
              <FilterSectionPrimitive title="Epic">
                {epics.map((e) => (
                  <FilterRow
                    key={e.id}
                    label={e.epic_name ?? "Epic"}
                    selected={filters.epicIds.includes(String(e.id))}
                    onClick={() => toggle("epicIds", String(e.id))}
                  />
                ))}
                <FilterRow
                  label="No epic"
                  muted
                  selected={filters.epicIds.includes("_none")}
                  onClick={() => toggle("epicIds", "_none")}
                />
              </FilterSectionPrimitive>
            )}

            {sections.includes("version") && (
              <FilterSectionPrimitive title="Version">
                {versionOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-dimmer">No versions yet</div>
                )}
                {versionOptions.map((v) => (
                  <FilterRow
                    key={v}
                    label={v}
                    selected={filters.versions.includes(v)}
                    onClick={() => toggle("versions", v)}
                  />
                ))}
                <FilterRow
                  label="No version"
                  muted
                  selected={filters.versions.includes("_none")}
                  onClick={() => toggle("versions", "_none")}
                />
              </FilterSectionPrimitive>
            )}

            {sections.includes("assignee") && (
              <FilterSectionPrimitive title="Assignee">
                {assigneeOptions.map((a) => (
                  <FilterRow
                    key={a.id}
                    label={a.name}
                    dot={a.color}
                    selected={filters.assigneeIds.includes(a.id)}
                    onClick={() => toggle("assigneeIds", a.id)}
                  />
                ))}
                <FilterRow
                  label="Unassigned"
                  muted
                  selected={filters.assigneeIds.includes("_unassigned")}
                  onClick={() => toggle("assigneeIds", "_unassigned")}
                />
              </FilterSectionPrimitive>
            )}
    </div>
  );
}
