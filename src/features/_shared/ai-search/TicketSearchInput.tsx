import { Loader2, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { AiTicketSearch } from "./useAiTicketSearch";

/** Ticket search box with an optional one-shot AI mode (sparkles button). */
export function TicketSearchInput({ search, setSearch, ai, getCandidates }: {
  search: string;
  setSearch: (s: string) => void;
  ai?: AiTicketSearch;
  getCandidates?: () => TicketRow[] | Promise<TicketRow[]>;
}) {
  const canAi = !!ai && !!getCandidates;
  const go = async () => {
    if (!ai || !getCandidates) return;
    ai.run(search, await getCandidates());
  };
  return (
    <div className="flex items-center gap-2">
      {ai?.result && (
        <span className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] bg-accent/15 text-accent hairline">
          <Sparkles className="h-3 w-3" />
          AI: {ai.result.ids.size} ticket{ai.result.ids.size === 1 ? "" : "s"}
          <button type="button" aria-label="Clear AI results" onClick={() => { ai.clear(); }} className="hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => { ai?.clear(); setSearch(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && ai?.armed) { e.preventDefault(); go(); } }}
          placeholder={ai?.armed ? "Describe it, then press Enter…" : "Search ID or title…"}
          className={cn("h-8 w-[240px] pl-8 text-xs", canAi ? "pr-14" : "pr-7", ai?.armed && "ring-1 ring-accent border-accent")}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {search && (
            <button type="button" onClick={() => { ai?.clear(); setSearch(""); }} aria-label="Clear search" className="text-dimmer hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {canAi && (
            <button
              type="button"
              disabled={ai!.loading}
              onClick={() => (ai!.armed && search.trim() ? go() : ai!.setArmed(!ai!.armed))}
              aria-label={ai!.armed ? "Run AI search" : "Turn on AI search"}
              aria-pressed={ai!.armed}
              title="AI search (one search at a time)"
              className={cn("transition", ai!.armed ? "text-accent" : "text-dimmer hover:text-accent")}
            >
              {ai!.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
