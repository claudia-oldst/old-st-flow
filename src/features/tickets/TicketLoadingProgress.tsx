import { Loader2 } from "lucide-react";
export function TicketLoadingProgress({ loadedCount, totalCount }: { loadedCount: number; totalCount: number }) {
  return <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
    <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
    Loading tickets… {loadedCount} of {totalCount}
  </div>;
}
