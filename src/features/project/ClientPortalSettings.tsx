import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Eye,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Props {
  project: Project;
  onUpdated?: (p: Project) => void;
}

function randomHash(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  const alphabet = "abcdefghijkmnopqrstuvwxyz0123456789";
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

// Format an ISO string to the value expected by <input type="datetime-local">
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClientPortalSettings({ project, onUpdated }: Props) {
  const proj = project as Project & {
    client_visibility_cutoff: string | null;
    client_portal_hash: string | null;
    client_summary_published: string | null;
    client_summary_draft: string | null;
    client_summary_updated_at: string | null;
  };

  const [cutoff, setCutoff] = useState<string>(toLocalInput(proj.client_visibility_cutoff));
  const [hash, setHash] = useState<string | null>(proj.client_portal_hash);
  const [draft, setDraft] = useState<string>(proj.client_summary_draft ?? "");
  const [published, setPublished] = useState<string>(proj.client_summary_published ?? "");
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    setCutoff(toLocalInput(proj.client_visibility_cutoff));
    setHash(proj.client_portal_hash);
    setDraft(proj.client_summary_draft ?? "");
    setPublished(proj.client_summary_published ?? "");
  }, [proj.id, proj.client_visibility_cutoff, proj.client_portal_hash, proj.client_summary_draft, proj.client_summary_published]);

  const portalUrl = hash ? `${window.location.origin}/h/${hash}` : null;

  const persist = async (patch: Record<string, any>): Promise<Project | null> => {
    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", project.id)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    onUpdated?.(data as Project);
    return data as Project;
  };

  const handleSaveCutoff = async () => {
    const iso = cutoff ? new Date(cutoff).toISOString() : null;
    const r = await persist({ client_visibility_cutoff: iso });
    if (r) toast.success(iso ? "Visibility cutoff saved" : "Portal disabled");
  };

  const handleSetNow = async () => {
    const now = new Date();
    setCutoff(toLocalInput(now.toISOString()));
    const r = await persist({ client_visibility_cutoff: now.toISOString() });
    if (r) toast.success("Cutoff set to now");
  };

  const handleDisable = async () => {
    setCutoff("");
    const r = await persist({ client_visibility_cutoff: null });
    if (r) toast.success("Portal disabled");
  };

  const handleGenerateHash = async () => {
    const h = randomHash();
    const r = await persist({ client_portal_hash: h });
    if (r) {
      setHash(h);
      toast.success("Portal link generated");
    }
  };

  const handleRegenerateHash = async () => {
    if (!confirm("Regenerate the link? The previous URL will stop working.")) return;
    const h = randomHash();
    const r = await persist({ client_portal_hash: h });
    if (r) {
      setHash(h);
      toast.success("New portal link generated");
    }
  };

  const handleCopy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    toast.success("Link copied");
  };

  const handleGenerateAi = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("client-summary", {
      body: { project_id: project.id },
    });
    setGenerating(false);
    if (error) {
      toast.error(error.message ?? "Failed to generate summary");
      return;
    }
    if (data?.draft) {
      setDraft(data.draft);
      toast.success("Draft ready — review and publish");
    } else if (data?.error) {
      toast.error(data.error);
    }
  };

  const handleSaveDraft = async () => {
    const r = await persist({
      client_summary_draft: draft,
      client_summary_updated_at: new Date().toISOString(),
    });
    if (r) toast.success("Draft saved");
  };

  const handlePublish = async () => {
    const r = await persist({
      client_summary_published: draft,
      client_summary_updated_at: new Date().toISOString(),
    });
    if (r) {
      setPublished(draft);
      toast.success("Published to client");
    }
  };

  const handleUnpublish = async () => {
    const r = await persist({ client_summary_published: null });
    if (r) {
      setPublished("");
      toast.success("Removed from client view");
    }
  };

  return (
    <div className="space-y-6">
      {/* Visibility cutoff */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Visibility cutoff</div>
            <div className="text-xs text-dim mt-0.5">
              Clients only see hours and changes dated up to this point.
            </div>
          </div>
          {proj.client_visibility_cutoff && (
            <span className="inline-flex items-center gap-1 text-[11px] text-health-good">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          )}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="cutoff" className="text-xs text-dimmer">
              Date & time
            </Label>
            <Input
              id="cutoff"
              type="datetime-local"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveCutoff}>Save</Button>
          <Button variant="ghost" onClick={handleSetNow}>
            Set to now
          </Button>
          {proj.client_visibility_cutoff && (
            <Button variant="ghost" className="text-destructive" onClick={handleDisable}>
              Disable
            </Button>
          )}
        </div>
      </div>

      {/* Portal link */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-sm font-medium">Portal link</div>
        {!hash ? (
          <Button onClick={handleGenerateHash}>Generate link</Button>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Input value={portalUrl ?? ""} readOnly className="font-mono text-xs flex-1 min-w-[260px]" />
              <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              <a href={portalUrl ?? "#"} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" title="Open">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <Button variant="ghost" size="icon" onClick={handleRegenerateHash} title="Regenerate">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {!proj.client_visibility_cutoff && (
              <div className="text-[11px] text-health-warn">
                Set a visibility cutoff above to activate this link for the client.
              </div>
            )}
          </>
        )}
      </div>

      {/* Executive summary */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Executive summary</div>
            <div className="text-xs text-dim mt-0.5">
              AI-generated draft. Edit before publishing — only the published version is visible to the client.
            </div>
          </div>
          <Button onClick={handleGenerateAi} disabled={generating} className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "edit" | "preview")}>
          <TabsList className="grid w-full grid-cols-2 max-w-[260px]">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3 w-3 mr-1" /> Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              placeholder="Draft will appear here after generation, or write your own (Markdown supported)…"
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            <div className="rounded-md border border-white/10 p-3 min-h-[140px] prose prose-invert prose-sm max-w-none">
              {draft ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              ) : (
                <div className="text-dim italic text-sm">No draft yet.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] text-dimmer">
            {published
              ? "A published summary is visible to the client."
              : "Nothing is visible to the client yet."}
            {proj.client_summary_updated_at && (
              <span className="ml-2 font-mono">
                Updated {format(new Date(proj.client_summary_updated_at), "MMM d, HH:mm")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleSaveDraft}>
              Save draft
            </Button>
            {published && (
              <Button variant="ghost" className="text-destructive" onClick={handleUnpublish}>
                Unpublish
              </Button>
            )}
            <Button onClick={handlePublish} disabled={!draft.trim()}>
              Publish to client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
