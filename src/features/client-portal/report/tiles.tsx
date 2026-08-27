import { format } from "date-fns";
import { formatHours } from "@/lib/utils";
import { SegmentedBar } from "@/features/_shared/SegmentedBar";
import { formatGBP, type PortalMonth } from "../types";

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
      <div className="font-mono ticker text-2xl mt-1">{value}</div>
      {children}
    </div>
  );
}

export function MonthTile({ month, showRate }: { month: PortalMonth; showRate: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-dimmer">
        {format(new Date(month.start), "MMMM yyyy")} to date
      </div>
      <div className="font-mono ticker text-2xl mt-1">
        {showRate ? formatGBP(month.cost) : formatHours(month.billed_hours)}
      </div>
      <div className="mt-3 space-y-1">
        <MiniRow label="Frontend" value={formatHours(month.fe_actual)} />
        <MiniRow label="Backend" value={formatHours(month.be_actual)} />
        <MiniRow label="Project" value={formatHours(month.proj_actual)} />
        {month.discount_hours > 0 && (
          <MiniRow label="Discounted" value={`−${formatHours(month.discount_hours)}`} />
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

export function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-dim">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hairline-b last:border-b-0 text-sm">
      <span className="text-dim">{label}</span>
      <span className="font-mono">{value}</span>
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
