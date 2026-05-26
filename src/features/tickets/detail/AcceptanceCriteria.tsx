import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownView } from "./MarkdownView";

export function AcceptanceCriteria({
  ticketId,
  value,
  canEdit,
  onSaved,
}: {
  ticketId: string;
  value: string | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [localValue, setLocalValue] = useState<string | null>(value);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    setDraft(value ?? "");
    setEditing(false);
    setPreview(false);
  }, [value, ticketId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-acceptance-criteria", {
        body: { ticket_id: ticketId },
      });
      if (error) throw error;
      const next = (data as any)?.draft?.trim();
      if (!next) {
        toast.error("AI returned no content. Try again.");
        return;
      }
      setDraft(next);
      setPreview(false);
      toast.success("Draft generated — review and Save");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const startGenerate = async () => {
    if (draft.trim() && !window.confirm("Replace current acceptance criteria with an AI-generated draft?")) return;
    setEditing(true);
    await generate();
  };

  const save = async () => {
    setSaving(true);
    const next = draft.trim() ? draft : null;
    // optimistic: show immediately
    setLocalValue(next);
    setEditing(false);
    setPreview(false);
    const { error } = await supabase
      .from("tickets")
      .update({ acceptance_criteria: next })
      .eq("id", ticketId);
    setSaving(false);
    if (error) {
      // rollback
      setLocalValue(value);
      return toast.error(error.message);
    }
    toast.success("Acceptance criteria saved");
    onSaved();
  };

  const hasContent = !!(localValue && localValue.trim());

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-dimmer">Acceptance criteria</div>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={startGenerate}
                disabled={generating}
                className="gap-1 text-xs"
                title="Generate with AI based on project context"
              >
                <Sparkles className="h-3 w-3" /> {generating ? "Generating…" : hasContent ? "Regenerate" : "Generate"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
                <Edit3 className="h-3 w-3" /> {hasContent ? "Edit" : "Add"}
              </Button>
            </div>
          )}
        </div>
        {hasContent ? (
          <div className="rounded-lg bg-white/[0.02] hairline p-4">
            <MarkdownView source={localValue!} />
          </div>
        ) : (
          <div className="text-sm text-dim p-4 rounded-lg bg-white/[0.02] hairline">
            No acceptance criteria yet.
            {canEdit && " Click Add to write some — markdown is supported."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-dimmer">Acceptance criteria</div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={generating}
            className="gap-1 text-xs"
            title="Generate with AI based on project context"
          >
            <Sparkles className="h-3 w-3" /> {generating ? "Generating…" : "Generate"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview((v) => !v)}
            className="text-xs"
          >
            {preview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>
      {preview ? (
        <div className="rounded-lg bg-white/[0.02] hairline p-4 min-h-[280px]">
          {draft.trim() ? (
            <MarkdownView source={draft} />
          ) : (
            <div className="text-sm text-dimmer">Nothing to preview.</div>
          )}
        </div>
      ) : (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={"Markdown supported.\n\n- Given …\n- When …\n- Then …"}
          className="min-h-[280px] font-mono text-sm"
        />
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(localValue ?? "");
            setEditing(false);
            setPreview(false);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
