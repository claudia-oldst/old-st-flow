import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TicketType } from "@/lib/types";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { ParentTicketSelect } from "@/features/tickets/ParentTicketSelect";
import { ticketInputSchema } from "@/lib/schemas/ticket";
import { toast } from "sonner";

export function QuickAddRow({
  projectId,
  statusId,
  onCreated,
}: {
  projectId: string;
  statusId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("Standard");
  const [fe, setFe] = useState("");
  const [be, setBe] = useState("");
  const [proj, setProj] = useState("");
  const [epicId, setEpicId] = useState<number | null>(null);
  const [parentTicketId, setParentTicketId] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isProj = type === "Proj";
  const isBug = type === "Bug";

  const submit = async () => {
    const projHrs = parseFloat(proj) || 0;
    const feHrs = parseFloat(fe) || 0;
    const beHrs = parseFloat(be) || 0;

    const parsed = ticketInputSchema.safeParse({
      title,
      ticket_type: type,
      epic_id: epicId,
      fe_estimate: isProj ? 0 : feHrs,
      be_estimate: isProj ? 0 : beHrs,
      project_estimate: isProj ? projHrs : 0,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid ticket");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("tickets").insert({
      project_id: projectId,
      title: parsed.data.title,
      ticket_type: parsed.data.ticket_type,
      status_id: statusId,
      epic_id: parsed.data.epic_id ?? null,
      original_fe_estimate: parsed.data.fe_estimate ?? 0,
      original_be_estimate: parsed.data.be_estimate ?? 0,
      current_fe_estimate: parsed.data.fe_estimate ?? 0,
      current_be_estimate: parsed.data.be_estimate ?? 0,
      original_project_estimate: parsed.data.project_estimate ?? 0,
      current_project_estimate: parsed.data.project_estimate ?? 0,
      parent_ticket_id: isBug ? parentTicketId : null,
      // ticket_number + formatted_id are filled by the before-insert trigger
      ticket_number: 0,
      formatted_id: "",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTitle("");
    setFe("");
    setBe("");
    setProj("");
    setType("Standard");
    setEpicId(null);
    setParentTicketId(null);
    setParentTitle(null);
    onCreated();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs text-dimmer hover:text-foreground hover:bg-white/5 transition"
      >
        <Plus className="h-3 w-3" /> Add ticket
      </button>
    );
  }

  return (
    <div className="mt-2 p-2 rounded-lg bg-surface-2 hairline space-y-1.5">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        onBlur={() => !title && setOpen(false)}
        placeholder="Ticket title…"
        className="h-7 text-xs"
      />
      <div className="flex gap-1.5">
        <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="Bug">Bug</SelectItem>
            <SelectItem value="CR">CR</SelectItem>
            <SelectItem value="Proj">Proj</SelectItem>
          </SelectContent>
        </Select>
        {isProj ? (
          <Input value={proj} onChange={(e) => setProj(e.target.value)} placeholder="Project hrs" className="h-7 text-xs w-24" type="number" step="0.5" />
        ) : (
          <>
            <Input value={fe} onChange={(e) => setFe(e.target.value)} placeholder="FE" className="h-7 text-xs w-12" type="number" step="0.5" />
            <Input value={be} onChange={(e) => setBe(e.target.value)} placeholder="BE" className="h-7 text-xs w-12" type="number" step="0.5" />
          </>
        )}
      </div>
      <EpicSelect projectId={projectId} value={epicId} onChange={setEpicId} size="sm" />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-6 text-xs px-2">Cancel</Button>
        <Button size="sm" onClick={submit} disabled={busy || !title.trim()} className="h-6 text-xs px-2">Add</Button>
      </div>
    </div>
  );
}
