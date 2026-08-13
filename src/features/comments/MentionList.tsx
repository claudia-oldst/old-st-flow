import { MemberAvatar } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import type { MentionCandidate } from "./useMentionCandidates";

interface Props {
  items: MentionCandidate[];
  activeIndex: number;
  onPick: (m: MentionCandidate) => void;
}

export function MentionList({ items, activeIndex, onPick }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="absolute bottom-full left-2 mb-1 z-50 w-56 max-h-56 overflow-y-auto rounded-md hairline bg-popover shadow-lg py-1">
      {items.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(m);
          }}
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs",
            i === activeIndex ? "bg-primary/15 text-foreground" : "hover:bg-white/5"
          )}
        >
          <MemberAvatar name={m.name} color={m.avatar_color} size="xs" />
          <span className="truncate">{m.name}</span>
        </button>
      ))}
    </div>
  );
}
