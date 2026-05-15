import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  approved: "bg-health-good/15 text-health-good ring-health-good/30",
  pending: "bg-health-warn/15 text-health-warn ring-health-warn/30",
  rejected: "bg-health-bad/15 text-health-bad ring-health-bad/30",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const cls = STATUS_CLASS[status] ?? "bg-white/5 text-dim ring-white/10";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full ring-1 text-[10px] capitalize",
        cls,
      )}
    >
      {status}
    </span>
  );
}
