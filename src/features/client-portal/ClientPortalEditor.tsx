import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Copy, ExternalLink, Sparkles, Loader2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Project } from "@/lib/types";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useProjectEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { usePortalPreview } from "./usePortalData";
import { PortalView } from "./PortalView";
import { PortalChangeRequests } from "./PortalChangeRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function makeHash() {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

export function ClientPortalEditor() {
  const { id } = useParams<{ id: string }>();
  const role = useProjectRole(id);
  const canEdit = isPMBA(role);

  const [project, setProject] = useState<Project | null>(null);
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProject(data);
        setIntro(data.client_summary_draft ?? data.client_summary_published ?? "");
      });
  }, [id]);

  const hash = project?.client_portal_hash ?? null;
  const { data: payload, refresh } = usePortalPreview(id ?? "", hash, asOf);

  const { changes } = useProjectEstimateChanges(id ?? "");
  const { tickets } = useProjectTickets(id ?? "");

  // Group estimate changes by epic, only for changes within the as-of window.
  const epicDeltas = useMemo(() => {
    const ticketEpic = new Map(tickets.map((t) => [t.id, t.epic_id]));
    const ticketLabel = new Map(tickets.map((t) => [t.id, t.formatted_id]));
    const cutoffMs = asOf.getTime();
    const map = new Map<
      number,
      { delta: number; rows: Array<{ ticket: string; discipline: string; delta: number; reason: string | null }> }
    >();
    for (const c of changes) {
      if (c.status !== "approved") continue;
      const occurredAt = new Date(c.created_at).getTime();
      if (occurredAt > cutoffMs) continue;
      const epicId = ticketEpic.get(c.ticket_id);
      if (epicId == null) continue;
      const entry = map.get(epicId) ?? { delta: 0, rows: [] };
      entry.delta += Number(c.delta) || 0;
      entry.rows.push({
        ticket: ticketLabel.get(c.ticket_id) ?? c.ticket_id.slice(0, 6),
        discipline: c.discipline,
        delta: Number(c.delta) || 0,
        reason: c.reason ?? null,
      });
      map.set(epicId, entry);
    }
    return map;
  }, [changes, tickets, asOf]);

  if (!id) return null;
  if (!canEdit) {
    return (
      <div className="text-sm text-dim">
        Only PM/BA users can manage the client portal.
      </div>
    );
  }

  async function ensureHash() {
    if (!project) return null;
    if (project.client_portal_hash) return project.client_portal_hash;
    const newHash = makeHash();
    const { data, error } = await supabase
      .from("projects")
      .update({
        client_portal_hash: newHash,
        client_visibility_cutoff: asOf.toISOString(),
      })
      .eq("id", project.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      toast.error("Failed to enable portal");
      return null;
    }
    setProject(data);
    return data.client_portal_hash;
  }

  async function handleUpdate() {
    if (!project) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .update({
        client_visibility_cutoff: asOf.toISOString(),
        client_summary_draft: intro,
      })
      .eq("id", project.id)
      .select()
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      toast.error("Update failed");
      return;
    }
    setProject(data);
    refresh();
    toast.success("Snapshot updated");
  }

  async function handlePublish() {
    if (!project) return;
    setBusy(true);
    const newHash = await ensureHash();
    if (!newHash) {
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .update({
        client_visibility_cutoff: asOf.toISOString(),
        client_summary_published: intro,
        client_summary_draft: intro,
        client_summary_updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .select()
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      toast.error("Publish failed");
      return;
    }
    setProject(data);
    refresh();
    toast.success("Published to client");
  }

  async function handleDisable() {
    if (!project) return;
    const { data, error } = await supabase
      .from("projects")
      .update({ client_portal_hash: null })
      .eq("id", project.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      toast.error("Failed to disable portal");
      return;
    }
    setProject(data);
    toast.success("Public link disabled");
  }

  const portalUrl = hash ? `${window.location.origin}/h/${hash}` : null;

  return (
    <div className={cn("grid gap-6", previewOpen ? "lg:grid-cols-[420px_1fr]" : "grid-cols-1")}>
      {/* LEFT: controls */}
      <div className={cn("space-y-4", !previewOpen && "max-w-5xl mx-auto w-full")}>
        {!previewOpen && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2 text-xs">
              <PanelRightOpen className="h-3.5 w-3.5" />
              Show client preview
            </Button>
          </div>
        )}
        {/* Toolbar */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-dimmer">
            Snapshot
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <CalendarIcon className="h-3.5 w-3.5" />
                As of {format(asOf, "d MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={asOf}
                onSelect={(d) => d && setAsOf(d)}
                disabled={(d) => d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {portalUrl ? (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-dimmer">
                Public link
              </div>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate font-mono text-xs px-2 py-1.5 rounded bg-white/5 hairline">
                  {portalUrl}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(portalUrl);
                    toast.success("Copied");
                  }}
                  aria-label="Copy link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  asChild
                  aria-label="Open portal"
                >
                  <a href={portalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
              {project?.client_summary_updated_at && (
                <div className="text-[10px] text-dimmer">
                  Last published{" "}
                  {format(new Date(project.client_summary_updated_at), "d MMM yyyy 'at' HH:mm")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-dim">
              Public link disabled. The client cannot view the URL, but you can still plan what they'd see below. Click "Publish to client" to enable a new link.
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdate}
              disabled={busy}
              className="flex-1"
            >
              Update Preview
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={busy}
              className="flex-1"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Publish to client
            </Button>
            {hash && (
              <Button size="sm" variant="ghost" onClick={handleDisable}>
                Disable
              </Button>
            )}
          </div>
        </div>

        {/* Intro */}
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-dimmer">
            Intro for client
          </div>
          <Textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="A short note shown at the top of the client portal."
            rows={5}
            className="text-sm"
          />
        </div>

        {/* Per-epic summaries — all scope-changed epics shown so PMBA can edit/toggle. */}
        {payload && payload.epics.some((e) => epicDeltas.has(e.id)) && (
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider text-dimmer">
              Epics with scope changes
            </div>
            <div className="space-y-3">
              {payload.epics
                .filter((e) => epicDeltas.has(e.id))
                .map((e) => (
                  <EpicSummaryEditor
                    key={e.id}
                    projectId={id}
                    projectName={project?.name ?? ""}
                    epicId={e.id}
                    epicName={e.epic_name ?? "Untitled epic"}
                    originalHours={e.original_estimate}
                    currentHours={e.current_estimate}
                    delta={epicDeltas.get(e.id)?.delta ?? 0}
                    changes={epicDeltas.get(e.id)?.rows ?? []}
                    initialText={e.pmba_text ?? ""}
                    initialIncluded={e.included ?? true}
                    onSaved={refresh}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: live preview */}
      {previewOpen && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-dimmer">
              Client preview
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreviewOpen(false)}
              className="h-6 px-2 gap-1.5 text-[10px] uppercase tracking-wider text-dimmer hover:text-foreground"
            >
              <PanelRightClose className="h-3 w-3" />
              Hide
            </Button>
          </div>
          <div className="glass rounded-2xl p-6 lg:p-8">
            {payload ? (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="change-requests">Change Requests</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                  <PortalView payload={payload} showRate />
                </TabsContent>
                <TabsContent value="change-requests">
                  <PreviewChangeRequests projectId={id} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-sm text-dim text-center py-12">
                Loading preview…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EpicSummaryEditor({
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
}: {
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
}) {
  const [text, setText] = useState(initialText);
  const [included, setIncluded] = useState(initialIncluded);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setText(initialText);
    setIncluded(initialIncluded);
  }, [initialText, initialIncluded]);

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
      const draft: string = (data as any)?.draft ?? "";
      if (draft) {
        setText(draft);
        await persist(draft, included, { silent: true });
        toast.success("Draft generated");
      } else {
        toast.error("No draft returned");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function persist(nextText: string, nextIncluded: boolean, opts?: { silent?: boolean }) {
    const { error } = await supabase
      .from("project_epic_summaries")
      .upsert(
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

  async function handleBlur() {
    if (text === initialText) return;
    await persist(text, included, { silent: true });
  }

  async function handleToggleIncluded(next: boolean) {
    setIncluded(next);
    await persist(text, next, { silent: true });
  }

  return (
    <div className="rounded-xl bg-white/[0.02] hairline p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-medium truncate">{epicName}</div>
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
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Why has the estimate changed? (Visible to the client)"
        rows={3}
        className="text-sm"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-dim">
          <Switch checked={included} onCheckedChange={handleToggleIncluded} />
          Show to client
        </label>
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
    </div>
  );
}

function PreviewChangeRequests({ projectId }: { projectId: string }) {
  const { tickets, reload } = useProjectTickets(projectId);
  const { epics } = useProjectEpics(projectId);
  const [acronym, setAcronym] = useState("?");

  useEffect(() => {
    supabase
      .from("projects")
      .select("acronym")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => setAcronym((data as any)?.acronym ?? "?"));
  }, [projectId]);

  const baseline = useMemo(
    () => tickets.filter((t) => t.ticket_type !== "CR"),
    [tickets],
  );
  const crs = useMemo(
    () => tickets.filter((t) => t.ticket_type === "CR"),
    [tickets],
  );

  async function handleApprove(ticketId: string) {
    const { error } = await supabase
      .from("tickets")
      .update({
        cr_approval: "approved",
        cr_decided_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("cr_approval", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Change request approved");
    reload();
  }

  return (
    <PortalChangeRequests
      acronym={acronym}
      epics={epics.map((e) => ({ id: e.id, epic_name: e.epic_name }))}
      baselineTickets={baseline as any}
      crTickets={crs as any}
      onApprove={handleApprove}
    />
  );
}
