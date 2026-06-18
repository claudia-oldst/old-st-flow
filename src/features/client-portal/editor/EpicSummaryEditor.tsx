import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { epicSummarySchema } from "@/lib/schemas/clientPortal";
import { toast } from "sonner";

export interface EpicSummaryEditorProps {
  projectId: string;
  projectName: string;
  epicId: number;
  epicName: string;
  originalHours: number;
  currentHours: number;
  delta: number;
  changes: Array<{ ticket: string; discipline: string; delta: number; reason: string | null }>;
  initialText: string;
  initialIncluded: boolean;
  onSaved: () => void;
}

export function EpicSummaryEditor({
  projectId,
  projectName,
  epicId,
  epicName,
  originalHours,
  currentHours,
  delta,
  changes,
  initialText,
  initialIncluded,
  onSaved,
}: EpicSummaryEditorProps) {
  const [text, setText] = useState(initialText);
  const [included, setIncluded] = useState(initialIncluded);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(initialText.trim().length > 0);

  useEffect(() => {
    setText(initialText);
    setIncluded(initialIncluded);
    setExpanded((prev) => prev || initialText.trim().length > 0);
  }, [initialText, initialIncluded]);

  async function persist(nextText: string, nextIncluded: boolean, opts?: { silent?: boolean }) {
    const parsed = epicSummarySchema.safeParse({ text: nextText, included: nextIncluded });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid summary");
      return false;
    }
    const { error } = await supabase.from("project_epic_summaries").upsert(
      {
        project_id: projectId,
        epic_id: epicId,
        pmba_text: nextText,
        included: nextIncluded,
        delta_hours: delta,
      },
      { onConflict: "project_id,epic_id" },
    );
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!opts?.silent) toast.success("Saved");
    onSaved();
    return true;
  }

  async function generate() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("epic-summary", {
        body: {
          epic_name: epicName,
          project_name: projectName,
          delta_hours: delta,
          original_hours: originalHours,
          current_hours: currentHours,
          changes,
        },
      });
      if (error) throw error;
      const draft: string = (data as { draft?: string } | null)?.draft ?? "";
      if (draft) {
        setText(draft);
        await persist(draft, included, { silent: true });
        toast.success("Draft generated");
      } else {
        toast.error("No draft returned");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleBlur() {
    if (text === initialText) return;
    await persist(text, included, { silent: true });
  }

  async function handleToggleIncluded(next: boolean) {
    setIncluded(next);
    await persist(text, next, { silent: true });
  }

  const isEmpty = text.trim().length === 0;

  return (
    <div className="rounded-xl bg-white/[0.02] hairline p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 flex-wrap text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-dim transition-transform shrink-0",
              expanded ? "" : "-rotate-90",
            )}
          />
          <div className="text-sm font-medium truncate">{epicName}</div>
          {isEmpty && !expanded && (
            <span className="text-[10px] text-dimmer">No note</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-1.5 text-[10px] text-dim"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={included}
              onCheckedChange={handleToggleIncluded}
              className="scale-75 origin-center"
            />
            Show to client
          </label>
          <div
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded-full ring-1",
              delta > 0
                ? "bg-health-warn/15 text-health-warn ring-health-warn/30"
                : "bg-health-good/15 text-health-good ring-health-good/30",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}h
          </div>
        </div>
      </button>
      {expanded && (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder="Why has the estimate changed? (Visible to the client)"
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={generate}
              disabled={generating}
              className="text-xs gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {text ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
