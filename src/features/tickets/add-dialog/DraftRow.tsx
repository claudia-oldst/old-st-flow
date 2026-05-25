import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { ParentTicketSelect } from "@/features/tickets/ParentTicketSelect";
import { cn } from "@/lib/utils";
import type { ProjectMember, TeamMember, TicketType } from "@/lib/types";
import type { Draft } from "./types";
import { AssignPopover } from "./AssignPopover";

export function DraftRow({
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
