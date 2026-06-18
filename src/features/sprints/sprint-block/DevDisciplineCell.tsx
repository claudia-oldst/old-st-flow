import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { AssigneeSlot } from "@/lib/types";
import { CapacityIndicator } from "../CapacityIndicator";

export function DevDisciplineCell({
  discipline,
  pooled,
  cap,
  isPMBA,
  onCommit,
}: {
  discipline: AssigneeSlot;
  pooled: number;
  cap: number;
  isPMBA: boolean;
  onCommit: (hours: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-dim">
        {discipline}
      </span>
      <div className="w-32">
        <CapacityIndicator used={pooled} cap={cap} />
      </div>
      {isPMBA && <CapInput value={cap} onCommit={onCommit} />}
    </div>
  );
}

function CapInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => {
    setLocal(String(value));
  }, [value]);
  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isFinite(n) || n < 0) {
          setLocal(String(value));
          return;
        }
        if (n !== value) onCommit(n);
      }}
      className="h-6 w-16 text-xs text-right font-mono"
    />
  );
}
