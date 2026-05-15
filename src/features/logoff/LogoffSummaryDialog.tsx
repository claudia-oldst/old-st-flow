import { useCallback, useEffect, useState } from "react";
import { Calendar as CalendarIcon, Check, Copy, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useDailyLoggedWork, type LoggedProject } from "./useDailyLoggedWork";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LogoffSummaryDialog({ open, onOpenChange }: Props) {
  const user = useCurrentUser((s) => s.user);
  const { toast } = useToast();
  const { data: projects, isLoading: loadingWork, error: workError } =
    useDailyLoggedWork(user?.id, open);

  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    async (input: LoggedProject[]) => {
      setGenerating(true);
      setGenError(null);
      try {
        const { data, error } = await supabase.functions.invoke(
          "daily-logoff-summary",
          {
            body: {
              projects: input.map((p) => ({
                name: p.name,
                tickets: p.tickets,
              })),
            },
          },
        );
        if (error) throw error;
        setSummary((data as { summary?: string })?.summary ?? "");
      } catch (e: any) {
        setGenError(e?.message ?? "Failed to generate summary");
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  // Auto-generate once data is loaded.
  useEffect(() => {
    if (!open) return;
    if (loadingWork || !projects) return;
    if (projects.length === 0) {
      setSummary("");
      return;
    }
    if (!summary && !generating && !genError) {
      void generate(projects);
    }
  }, [open, loadingWork, projects, summary, generating, genError, generate]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setSummary("");
      setGenError(null);
      setCopied(false);
    }
  }, [open]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const noWork = !loadingWork && projects && projects.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-accent" />
            Logging off — {today}
          </DialogTitle>
          <DialogDescription className="text-xs text-dim">
            Quick standup-style note for the wider dev team.
          </DialogDescription>
        </DialogHeader>

        {loadingWork || generating ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <p className="text-xs text-dimmer pt-2">
              {loadingWork ? "Loading today's work…" : "Drafting your summary…"}
            </p>
          </div>
        ) : workError ? (
          <p className="text-sm text-destructive py-4">
            Couldn't load today's time logs.
          </p>
        ) : noWork ? (
          <p className="text-sm text-dim py-6 text-center">
            No time logged today yet. Get something done first 👋
          </p>
        ) : genError ? (
          <div className="py-4 space-y-3">
            <p className="text-sm text-destructive">{genError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => projects && generate(projects)}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={10}
            className="font-mono text-sm leading-relaxed"
          />
        )}

        {!noWork && !workError && (
          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => projects && generate(projects)}
              disabled={generating || loadingWork || !projects?.length}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
            <Button
              size="sm"
              onClick={onCopy}
              disabled={!summary || generating}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
