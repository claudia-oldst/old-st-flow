import { useState } from "react";
import { useParams } from "react-router-dom";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { PortalView } from "./PortalView";
import { cn } from "@/lib/utils";
import { EpicSummaryEditor } from "./editor/EpicSummaryEditor";
import { PreviewChangeRequests } from "./editor/PreviewChangeRequests";
import { PortalToolbar } from "./editor/PortalToolbar";
import { useClientPortalEditor } from "./editor/useClientPortalEditor";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { SprintGanttOrEmpty } from "@/features/sprints/SprintGanttOrEmpty";




export function ClientPortalEditor() {
  const { id } = useParams<{ id: string }>();
  const role = useProjectRole(id);
  const canEdit = isPMBA(role);
  const [previewOpen, setPreviewOpen] = useState(true);
  const editor = useClientPortalEditor(id ?? "");
  const { discounts } = useEpicDiscounts(id);

  if (!id) return null;
  if (!canEdit) {
    return (
      <div className="text-sm text-dim">
        Only PM/BA users can manage the client portal.
      </div>
    );
  }

  const {
    project,
    asOf,
    setAsOf,
    intro,
    setIntro,
    busy,
    hash,
    payload,
    epicDeltas,
    refresh,
    handleUpdate,
    handlePublish,
    handleDisable,
  } = editor;

  return (
    <div className={cn("grid gap-6", previewOpen ? "lg:grid-cols-[420px_1fr]" : "grid-cols-1")}>
      <div className={cn("space-y-4", !previewOpen && "max-w-5xl mx-auto w-full")}>
        {!previewOpen && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2 text-xs">
              <PanelRightOpen className="h-3.5 w-3.5" />
              Show client preview
            </Button>
          </div>
        )}

        <PortalToolbar
          project={project}
          asOf={asOf}
          setAsOf={setAsOf}
          hash={hash}
          busy={busy}
          onUpdate={handleUpdate}
          onPublish={handlePublish}
          onDisable={handleDisable}
        />

        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-dimmer">Intro for client</div>
          <Textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="A short note shown at the top of the client portal."
            rows={5}
            className="text-sm"
          />
        </div>

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

      {previewOpen && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-dimmer">Client preview</div>
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
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="change-requests">Change Requests</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline">
                  <SprintGanttOrEmpty projectId={id} />
                </TabsContent>
                <TabsContent value="summary">
                  <PortalView payload={payload} showRate discounts={discounts} />
                </TabsContent>
                <TabsContent value="change-requests">
                  <PreviewChangeRequests projectId={id} />
                </TabsContent>
              </Tabs>

            ) : (
              <div className="text-sm text-dim text-center py-12">Loading preview…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
