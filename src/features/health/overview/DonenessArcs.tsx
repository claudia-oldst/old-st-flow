import { formatHours } from "@/lib/utils";
import { DONENESS_SEGMENTS, type Doneness } from "./doneness";

interface Props {
  r: number;
  strokeWidth: number;
  doneness: Doneness;
  label: string;
  onHover?: (tip: string[] | null) => void;
}

/** Status arcs clockwise from 12 o'clock; the remaining track is To Do. */
export function DonenessArcs({ r, strokeWidth, doneness, label, onHover }: Props) {
  const c = 2 * Math.PI * r;
  const total = doneness.todo + doneness.in_progress + doneness.for_integration + doneness.done;
  const pct = (h: number) => (total > 0 ? Math.round((h / total) * 100) : 0);
  const tip = [
    `${label} estimate`,
    ...DONENESS_SEGMENTS.map((s) => `${s.key === "done" ? "Done / logged" : s.label}: ${formatHours(doneness[s.key])} (${pct(doneness[s.key])}%)`),
    `To Do: ${formatHours(doneness.todo)} (${pct(doneness.todo)}%)`,
  ];

  let offset = 0;
  return (
    <g onMouseEnter={() => onHover?.(tip)} onMouseLeave={() => onHover?.(null)} className="cursor-default">
      <circle cx="70" cy="70" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth={strokeWidth} fill="none" />
      {total > 0 &&
        DONENESS_SEGMENTS.map((s) => {
          const len = (doneness[s.key] / total) * c;
          const start = offset;
          offset += len;
          if (len <= 0) return null;
          return (
            <circle
              key={s.key}
              data-segment={s.key}
              cx="70"
              cy="70"
              r={r}
              stroke={s.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-start}
              className="transition-all"
            />
          );
        })}
    </g>
  );
}
