import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { DisciplineStatus, Status } from "@/lib/types";
import { ChipGroup } from "./ChipGroup";
import type { Operator } from "./evaluateRule";

export interface Rule {
  id: string;
  position: number;
  fe_statuses: DisciplineStatus[];
  be_statuses: DisciplineStatus[];
  operator: Operator;
  status_id: string;
}

interface Props {
  rule: Rule;
  index: number;
  total: number;
  canEdit: boolean;
  statuses: Status[];
  onUpdate: (patch: Partial<Rule>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

export function RuleRow({
  rule, index, total, canEdit, statuses,
  onUpdate, onMove, onDelete,
}: Props) {
  const status = statuses.find((s) => s.id === rule.status_id);
  return (
    <div className="px-4 py-4 hover:bg-white/[0.02] transition">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs uppercase tracking-wider text-dimmer w-12">Rule {index + 1}</span>
        <span className="text-xs text-dim">IF</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-3 items-center">
        <span className="text-xs text-dim font-medium">FE in</span>
        <ChipGroup
          value={rule.fe_statuses}
          onChange={(v) => onUpdate({ fe_statuses: v })}
          disabled={!canEdit}
        />

        <Select
          value={rule.operator}
          onValueChange={(v) => onUpdate({ operator: v as Operator })}
          disabled={!canEdit}
        >
          <SelectTrigger className="h-8 w-[78px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>

        <ChipGroup
          value={rule.be_statuses}
          onChange={(v) => onUpdate({ be_statuses: v })}
          disabled={!canEdit}
        />
        <span className="text-xs text-dim font-medium pl-2">BE in</span>
        <span />
      </div>

      <div className="flex items-center gap-3 mt-4">
        <span className="text-xs text-dim">THEN Project =</span>
        <Select
          value={rule.status_id}
          onValueChange={(v) => onUpdate({ status_id: v })}
          disabled={!canEdit}
        >
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue>
              {status && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                  {status.name}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                  <span className="text-dimmer text-xs capitalize ml-1">({s.category})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="text-dimmer h-8 w-8" disabled={index === 0} onClick={() => onMove(-1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-dimmer h-8 w-8" disabled={index === total - 1} onClick={() => onMove(1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-dimmer hover:text-destructive h-8 w-8" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
