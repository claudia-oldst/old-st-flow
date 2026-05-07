import { cn } from "@/lib/utils";

export function BoardToolbar({
  mode,
  setMode,
  filterMine,
  setFilterMine,
  visibleCount,
  cardCount,
}: {
  mode: "project" | "discipline";
  setMode: (m: "project" | "discipline") => void;
  filterMine: boolean;
  setFilterMine: (v: boolean) => void;
  visibleCount: number;
  cardCount: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
        <button
          onClick={() => setMode("project")}
          className={cn(
            "px-3 py-1 text-xs rounded-md transition",
            mode === "project" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
          )}
        >
          Project status
        </button>
        <button
          onClick={() => setMode("discipline")}
          className={cn(
            "px-3 py-1 text-xs rounded-md transition",
            mode === "discipline" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
          )}
        >
          My discipline
        </button>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
        <button
          onClick={() => setFilterMine(false)}
          className={cn("px-3 py-1 text-xs rounded-md transition", !filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
        >
          All
        </button>
        <button
          onClick={() => setFilterMine(true)}
          className={cn("px-3 py-1 text-xs rounded-md transition", filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
        >
          My tickets
        </button>
      </div>
      <div className="text-xs text-dim ml-2">
        {mode === "project"
          ? `${visibleCount} ticket${visibleCount === 1 ? "" : "s"}`
          : `${cardCount} card${cardCount === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}
