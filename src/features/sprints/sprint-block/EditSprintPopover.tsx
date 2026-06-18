import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Sprint } from "../types";

interface Props {
  sprint: Sprint;
}

export function EditSprintPopover({ sprint }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(String(sprint.sprint_number));
  const [start, setStart] = useState(sprint.start_date);
  const [end, setEnd] = useState(sprint.end_date);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setNumber(String(sprint.sprint_number));
    setStart(sprint.start_date);
    setEnd(sprint.end_date);
  };

  const save = async () => {
    const n = Number(number);
    if (!Number.isInteger(n) || n < 1) {
      toast.error("Sprint number must be a positive integer");
      return;
    }
    if (!start || !end) {
      toast.error("Start and end dates are required");
      return;
    }
    if (end < start) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("sprints")
      .update({ sprint_number: n, start_date: start, end_date: end })
      .eq("id", sprint.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Sprint ${n} updated`);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Edit sprint block"
        >
          <Pencil className="h-3.5 w-3.5 text-dim" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="text-xs font-medium text-dim uppercase tracking-wide">
          Edit sprint block
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`sprint-num-${sprint.id}`} className="text-xs">
            Sprint number
          </Label>
          <Input
            id={`sprint-num-${sprint.id}`}
            type="number"
            min={1}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`sprint-start-${sprint.id}`} className="text-xs">
            Start date
          </Label>
          <Input
            id={`sprint-start-${sprint.id}`}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`sprint-end-${sprint.id}`} className="text-xs">
            End date
          </Label>
          <Input
            id={`sprint-end-${sprint.id}`}
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
