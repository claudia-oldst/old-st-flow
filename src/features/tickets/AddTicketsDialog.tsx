import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Users, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { useStatuses } from "@/features/statuses/useStatuses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { ProjectMember, TeamMember, TicketType } from "@/lib/types";

type Slot = "FE" | "BE" | "Project";

interface DraftAssignees {
  fe: Set<string>;
  be: Set<string>;
  project: Set<string>;
}

interface Draft {
  key: string;
  title: string;
  type: TicketType;
  epicId: number | null;
  statusId: string | null;
  fe: string;
  be: string;
  proj: string;
  assignees: DraftAssignees;
}

const newDraft = (statusId: string | null = null, type: TicketType = "Standard"): Draft => ({
  key: Math.random().toString(36).slice(2),
  title: "",
  type,
  epicId: null,
  statusId,
  fe: "",
  be: "",
  proj: "",
  assignees: { fe: new Set(), be: new Set(), project: new Set() },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void | Promise<void>;
  defaultType?: TicketType;
}

export function AddTicketsDialog({ open, onOpenChange, projectId, onCreated, defaultType = "Standard" }: Props) {
  const { statuses } = useStatuses();
  const defaultStatusId = useMemo(
    () => statuses.find((s) => s.category === "backlog")?.id ?? statuses[0]?.id ?? null,
    [statuses]
  );

  const [drafts, setDrafts] = useState<Draft[]>([newDraft(null, defaultType)]);
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset on open & seed first draft with default status
  useEffect(() => {
    if (open) {
      setDrafts([newDraft(defaultStatusId, defaultType)]);
    }
  }, [open, defaultStatusId, defaultType]);

  // Backfill statusId on drafts that don't have one once statuses load
  useEffect(() => {
    if (!defaultStatusId) return;
    setDrafts((prev) =>
      prev.map((d) => (d.statusId ? d : { ...d, statusId: defaultStatusId }))
    );
  }, [defaultStatusId]);

  // Load project members for assign popover
  useEffect(() => {
    if (!open) return;
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, projectId]);

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const remove = (key: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.key !== key)));

  const addAnother = () => setDrafts((prev) => [...prev, newDraft(defaultStatusId)]);

  const validDrafts = drafts.filter((d) => d.title.trim().length > 0);

  const submit = async () => {
    if (validDrafts.length === 0) return;
    setBusy(true);
    const payload = validDrafts.map((d) => {
      const isProj = d.type === "Proj";
      const fe = parseFloat(d.fe) || 0;
      const be = parseFloat(d.be) || 0;
      const proj = parseFloat(d.proj) || 0;
      return {
        project_id: projectId,
        title: d.title.trim(),
        ticket_type: d.type,
        status_id: d.statusId,
        epic_id: d.epicId,
        original_fe_estimate: isProj ? 0 : fe,
        original_be_estimate: isProj ? 0 : be,
        current_fe_estimate: isProj ? 0 : fe,
        current_be_estimate: isProj ? 0 : be,
        original_project_estimate: isProj ? proj : 0,
        current_project_estimate: isProj ? proj : 0,
        ticket_number: 0,
        formatted_id: "",
      };
    });

    const { data: created, error } = await supabase
      .from("tickets")
      .insert(payload as any)
      .select("id");

    if (error || !created) {
      setBusy(false);
      return toast.error(error?.message ?? "Failed to create tickets");
    }

    // Build assignee rows by index
    const assigneeRows: { ticket_id: string; user_id: string; slot: Slot }[] = [];
    created.forEach((row: any, idx: number) => {
      const d = validDrafts[idx];
      if (!d) return;
      const isProj = d.type === "Proj";
      if (isProj) {
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      } else {
        d.assignees.fe.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "FE" })
        );
        d.assignees.be.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "BE" })
        );
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      }
    });

    if (assigneeRows.length > 0) {
      const { error: aErr } = await supabase.from("ticket_assignees").insert(assigneeRows);
      if (aErr) {
        toast.error("Tickets created, but assignment failed: " + aErr.message);
      }
    }

    // Await the parent reload BEFORE closing so the list/board reflects new
    // tickets immediately — no perceived flash or refresh.
    try {
      await onCreated();
    } catch {
      /* parent handles its own errors */
    }
    setBusy(false);
    toast.success(
      `Created ${created.length} ticket${created.length === 1 ? "" : "s"}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong max-w-5xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Add tickets</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Add one or more tickets. Use “Add another ticket” to queue more before saving.
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((d, idx) => (
            <DraftRow
              key={d.key}
              draft={d}
              idx={idx}
              statuses={statuses}
              members={members}
              projectId={projectId}
              canDelete={drafts.length > 1}
              isLast={idx === drafts.length - 1}
              onChange={(patch) => update(d.key, patch)}
              onRemove={() => remove(d.key)}
              onEnterAtLast={addAnother}
            />
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between sm:flex-row flex-col gap-2">
          <Button
            variant="ghost"
            onClick={addAnother}
            type="button"
            className="gap-2 sm:mr-auto"
          >
            <Plus className="h-4 w-4" /> Add another ticket
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || validDrafts.length === 0}>
              Create {validDrafts.length} ticket{validDrafts.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftRow({
  draft,
  idx,
  statuses,
  members,
  projectId,
  canDelete,
  isLast,
  onChange,
  onRemove,
  onEnterAtLast,
}: {
  draft: Draft;
  idx: number;
  statuses: { id: string; name: string; color: string; category: string }[];
  members: (ProjectMember & { member: TeamMember })[];
  projectId: string;
  canDelete: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
  onEnterAtLast: () => void;
}) {
  const isProj = draft.type === "Proj";
  const titleEmpty = !draft.title.trim();

  const assigneeCount =
    draft.assignees.fe.size + draft.assignees.be.size + draft.assignees.project.size;

  return (
    <div
      className={cn(
        "rounded-xl hairline bg-white/[0.02] p-3 space-y-2",
        titleEmpty && idx > 0 && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="font-mono text-xs text-dimmer pt-2 w-6 shrink-0">{idx + 1}.</span>
        <Input
          autoFocus={idx === 0}
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isLast && draft.title.trim()) {
              e.preventDefault();
              onEnterAtLast();
            }
          }}
          placeholder="Ticket title…"
          className="h-9 text-sm flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canDelete}
          aria-label="Remove ticket"
          className="shrink-0"
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 pl-8">
        <div className="md:col-span-2">
          <Select
            value={draft.type}
            onValueChange={(v) => onChange({ type: v as TicketType })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Bug">Bug</SelectItem>
              <SelectItem value="CR">CR</SelectItem>
              <SelectItem value="Proj">Proj</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <EpicSelect
            projectId={projectId}
            value={draft.epicId}
            onChange={(id) => onChange({ epicId: id })}
            size="sm"
          />
        </div>

        <div className="md:col-span-3">
          <Select
            value={draft.statusId ?? undefined}
            onValueChange={(v) => onChange({ statusId: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isProj ? (
          <div className="md:col-span-2">
            <Input
              value={draft.proj}
              onChange={(e) => onChange({ proj: e.target.value })}
              placeholder="Proj hrs"
              type="number"
              step="0.5"
              className="h-8 text-xs"
            />
          </div>
        ) : (
          <>
            <div className="md:col-span-1">
              <Input
                value={draft.fe}
                onChange={(e) => onChange({ fe: e.target.value })}
                placeholder="FE"
                type="number"
                step="0.5"
                className="h-8 text-xs"
              />
            </div>
            <div className="md:col-span-1">
              <Input
                value={draft.be}
                onChange={(e) => onChange({ be: e.target.value })}
                placeholder="BE"
                type="number"
                step="0.5"
                className="h-8 text-xs"
              />
            </div>
          </>
        )}

        <div className={cn("md:col-span-2", isProj && "md:col-span-2")}>
          <AssignPopover
            members={members}
            type={draft.type}
            assignees={draft.assignees}
            onChange={(a) => onChange({ assignees: a })}
            count={assigneeCount}
          />
        </div>
      </div>
    </div>
  );
}

function AssignPopover({
  members,
  type,
  assignees,
  onChange,
  count,
}: {
  members: (ProjectMember & { member: TeamMember })[];
  type: TicketType;
  assignees: DraftAssignees;
  onChange: (a: DraftAssignees) => void;
  count: number;
}) {
  const isProj = type === "Proj";
  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");
  const projectEligible = members;

  const toggle = (slot: keyof DraftAssignees, id: string) => {
    const next: DraftAssignees = {
      fe: new Set(assignees.fe),
      be: new Set(assignees.be),
      project: new Set(assignees.project),
    };
    if (next[slot].has(id)) next[slot].delete(id);
    else next[slot].add(id);
    onChange(next);
  };

  const previewMembers: (TeamMember | undefined)[] = [];
  const collect = (set: Set<string>) =>
    set.forEach((uid) => {
      const m = members.find((x) => x.user_id === uid)?.member;
      if (m) previewMembers.push(m);
    });
  collect(assignees.fe);
  collect(assignees.be);
  collect(assignees.project);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full inline-flex items-center justify-between gap-2 px-2.5 rounded-md hairline bg-white/[0.02] hover:bg-white/[0.05] transition text-xs"
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 text-dimmer shrink-0" />
            {count === 0 ? (
              <span className="text-dimmer">Assign</span>
            ) : (
              <span className="flex -space-x-1.5">
                {previewMembers.slice(0, 3).map((m, i) => (
                  <MemberAvatar key={i} name={m.name} color={m.avatar_color} size="xs" />
                ))}
              </span>
            )}
          </span>
          {count > 0 && <span className="text-dimmer font-mono">{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3 space-y-4 max-h-[60vh] overflow-y-auto" align="end">
        {isProj ? (
          <SlotChips
            label="Team members"
            members={projectEligible}
            selected={assignees.project}
            onToggle={(id) => toggle("project", id)}
            showRole
          />
        ) : (
          <>
            <SlotChips
              label="Frontend"
              members={feEligible}
              selected={assignees.fe}
              onToggle={(id) => toggle("fe", id)}
            />
            <SlotChips
              label="Backend"
              members={beEligible}
              selected={assignees.be}
              onToggle={(id) => toggle("be", id)}
            />
            <SlotChips
              label="Project contributors"
              members={projectEligible}
              selected={assignees.project}
              onToggle={(id) => toggle("project", id)}
              showRole
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SlotChips({
  label,
  members,
  selected,
  onToggle,
  showRole,
}: {
  label: string;
  members: (ProjectMember & { member: TeamMember })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showRole?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-dimmer mb-1.5">{label}</div>
      {members.length === 0 ? (
        <div className="text-xs text-dim p-2 rounded-md bg-white/5 hairline">
          No eligible members.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const active = selected.has(m.user_id);
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => onToggle(m.user_id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition",
                  active
                    ? "bg-foreground text-background"
                    : "bg-white/5 hairline text-foreground hover:bg-white/10"
                )}
              >
                <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="xs" />
                {m.member.name}
                {showRole && <span className="text-[9px] opacity-60">{m.role}</span>}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
