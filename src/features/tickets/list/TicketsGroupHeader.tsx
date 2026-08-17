import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { toast } from "@/hooks/use-toast";

interface Props {
  label: string;
  count: number;
  color?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  /** Epic id when the group is a real epic and renaming is allowed. */
  epicId?: number | null;
  projectId?: string;
}

export function TicketsGroupHeader({
  label,
  count,
  color,
  isCollapsed,
  onToggle,
  epicId,
  projectId,
}: Props) {
  const canRename = !!epicId && !!projectId;
  const { renameEpic } = useProjectEpics(canRename ? projectId : undefined);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setValue(label);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === label) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await renameEpic(epicId!, trimmed);
    setSaving(false);
    setEditing(false);
    if (!ok) {
      toast({
        title: "Could not rename epic",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const Chevron = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div className="group w-full flex items-center gap-2 px-4 py-3 hairline-b text-left hover:bg-white/[0.02] transition">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isCollapsed ? "Expand group" : "Collapse group"}
        className="flex items-center gap-2 min-w-0 flex-1 text-left"
      >
        <Chevron className="h-3.5 w-3.5 text-dimmer shrink-0" />
        {color && (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: color }}
          />
        )}
        {!editing && (
          <>
            <span className="text-sm font-medium truncate">{label}</span>
            <span className="text-xs text-dimmer font-mono ml-1">{count}</span>
          </>
        )}
      </button>

      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            autoFocus
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="h-7 text-sm max-w-xs"
            aria-label="Epic name"
          />
          <button
            type="button"
            onClick={() => void save()}
            aria-label="Save epic name"
            className="text-dimmer hover:text-foreground transition p-1"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel rename"
            className="text-dimmer hover:text-foreground transition p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        canRename && (
          <button
            type="button"
            onClick={start}
            aria-label={`Rename epic ${label}`}
            className="text-dimmer hover:text-foreground opacity-0 group-hover:opacity-100 transition p-1"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )
      )}
    </div>
  );
}
