import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/** Inline capacity hours input for a developer + discipline. */
export function CapInput({
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
