import { format } from "date-fns";
import { formatHours } from "@/lib/utils";
import { formatGBP, type PortalMonth } from "./types";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";

export function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">{label}</div>
      <div className="font-mono ticker text-3xl mt-1">{value}</div>
      {children}
    </div>
  );
}

function MonthRow({ label, hours, muted }: { label: string; hours: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-dim">{label}</span>
      <span className={muted ? "font-mono text-dimmer" : "font-mono"}>
        {hours < 0 ? `−${formatHours(Math.abs(hours))}` : formatHours(hours)}
      </span>
    </div>
  );
}

/**
 * Month-to-date billing tile: hours logged inside the calendar month that the
 * portal cutoff falls in, split by discipline, less discounts raised that month.
 */
export function MonthToDateTile({
  month,
  showRate,
}: {
  month: PortalMonth;
  showRate: boolean;
}) {
  const label = `${format(new Date(month.start), "MMMM yyyy")} to date`;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">{label}</div>
      <div className="font-mono ticker text-3xl mt-1">
        {showRate ? formatGBP(month.cost) : formatHours(month.billed_hours)}
      </div>
      <div className="mt-3 space-y-1">
        <MonthRow label="Frontend" hours={month.fe_actual} />
        <MonthRow label="Backend" hours={month.be_actual} />
        <MonthRow label="Project" hours={month.proj_actual} />
        {month.discount_hours > 0 && (
          <MonthRow label="Discounted" hours={-month.discount_hours} muted />
        )}
        {showRate && (
          <div className="flex items-center justify-between text-xs pt-1 hairline-t mt-1">
            <span className="text-dim">Billed</span>
            <span className="font-mono">{formatHours(month.billed_hours)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DisciplineRow({
  label,
  done,
  inProgress,
  todo,
}: {
  label: string;
  done: number;
  inProgress: number;
  todo: number;
}) {
  const total = done + inProgress + todo;
  const donePct = total > 0 ? (done / total) * 100 : 0;
  const ipPct = total > 0 ? (inProgress / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span>{label}</span>
        <span className="text-dim font-mono">
          {done} done · {inProgress} in progress · {todo} to do
        </span>
      </div>
      <SegmentedBar
        segments={[
          { pct: donePct, className: "bg-health-good" },
          { pct: ipPct, className: "bg-chart-in-progress" },
        ]}
      />
    </div>
  );
}
