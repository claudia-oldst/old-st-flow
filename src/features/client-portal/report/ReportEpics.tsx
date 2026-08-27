import { formatHours } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import type { PortalPayload } from "../types";
import { EditableText, ReportSection } from "./EditableText";

type PortalEpic = PortalPayload["epics"][number];

const GRID =
  "grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3";

export function ReportEpics({ epics }: { epics: PortalEpic[] }) {
  return (
    <ReportSection title="Scope by epic">
      <div className="glass rounded-2xl overflow-hidden">
        <div
          className={`${GRID} px-4 py-2.5 hairline-b text-[10px] uppercase tracking-wider text-dimmer`}
        >
          <div>Epic</div>
          <div>Progress</div>
          <div className="text-right">Act / Cur / Orig</div>
        </div>
        {epics.map((e) => {
          const pct = (n: number) => (e.total_tickets > 0 ? (n / e.total_tickets) * 100 : 0);
          return (
            <div key={e.id} className="report-section hairline-b last:border-b-0">
              <div className={`${GRID} px-4 py-3 items-center`}>
                <div className="text-sm">{e.epic_name ?? "Untitled epic"}</div>
                <div>
                  <SegmentedBar
                    segments={[
                      { pct: pct(e.done_tickets), className: "bg-health-good" },
                      { pct: pct(e.dev_done_tickets ?? 0), className: "bg-health-good/50" },
                      { pct: pct(e.in_progress_tickets), className: "bg-chart-in-progress" },
                    ]}
                  />
                  <div className="text-[10px] text-dimmer mt-1">
                    {e.done_tickets}/{e.total_tickets} done
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  {formatHours(e.actual_hours)} / {formatHours(e.current_estimate)} /{" "}
                  {formatHours(e.original_estimate)}
                </div>
              </div>
              {e.included !== false && (e.pmba_text ?? "").trim() !== "" && (
                <EditableText
                  value={e.pmba_text ?? ""}
                  className="px-4 pb-3 text-xs leading-relaxed text-dim"
                />
              )}
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
