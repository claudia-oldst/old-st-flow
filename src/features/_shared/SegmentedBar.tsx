import { cn } from "@/lib/utils";

export interface Segment {
  pct: number;
  className: string;
}

interface Props {
  segments: Segment[];
  /** Applied to the track. Defaults to "h-2 bg-white/5". */
  className?: string;
}

/**
 * Generic N-segment horizontal progress bar.
 * Zero/negative segments are filtered out; remaining segments share the track width.
 */
export function SegmentedBar({ segments, className }: Props) {
  return (
    <div
      className={cn(
        "flex w-full rounded-full overflow-hidden",
        className ?? "h-2 bg-white/5",
      )}
    >
      {segments
        .filter((s) => s.pct > 0)
        .map((s, i) => (
          <div
            key={i}
            className={cn("h-full", s.className)}
            style={{ width: `${s.pct}%` }}
          />
        ))}
    </div>
  );
}
