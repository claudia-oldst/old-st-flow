import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { formatGBP } from "../types";
import { BillingTable } from "./BillingTable";
import { usePortalBilling, type BillingSource } from "./usePortalBilling";
import { buildRows, defaultMonths, monthRange, totalRow } from "./buildBilling";

const label = (m: string) => format(new Date(`${m}-01T12:00:00`), "MMMM yyyy");

/** Billing tab: per-epic estimates and monthly actuals, shared by public portal + preview. */
export function PortalBilling(props: BillingSource) {
  const { data, isPending, error } = usePortalBilling(props);

  const allMonths = useMemo(() => {
    if (!data) return [];
    const first = data.logs.map((l) => l.month).sort()[0];
    return monthRange(data.project.start_date, data.project.cutoff, first);
  }, [data]);

  const [selected, setSelected] = useState<string[] | null>(null);
  useEffect(() => setSelected(null), [allMonths.join("|")]);
  const months = (selected ?? defaultMonths(allMonths)).slice().sort();

  const rows = useMemo(() => (data ? buildRows(data) : []), [data]);
  const total = useMemo(() => totalRow(rows), [rows]);

  if (isPending) return <div className="text-sm text-dim text-center py-12">Loading…</div>;
  if (error || !data) return <div className="text-sm text-dim text-center py-12">Billing isn't available.</div>;
  if (rows.length === 0) return <div className="text-sm text-dim text-center py-12">No epics in scope yet.</div>;

  const rate = Number(data.project.rate_per_hour);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Billing</h2>
          <div className="text-xs text-dim mt-1">
            As of {format(new Date(data.project.cutoff), "d MMM yyyy")}
          </div>
        </div>
        <MultiSelectFilter
          label="Months"
          options={allMonths.map((m) => ({ value: m, label: label(m) }))}
          selected={months}
          onChange={setSelected}
        />
      </div>
      <BillingTable rows={rows} total={total} months={months} rate={rate} />
      <div className="text-[11px] text-dimmer">
        {rate > 0 && `Rate ${formatGBP(rate)}/h · `}Actual Total covers the whole project
        {data.project.start_date && ` since ${format(new Date(data.project.start_date), "d MMM yyyy")}`}.
      </div>
    </div>
  );
}
