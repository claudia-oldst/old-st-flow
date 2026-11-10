import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { childTypesFor, parentTypesFor } from "@/features/tickets/linkRules";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { ParentTicketSelect } from "@/features/tickets/ParentTicketSelect";
import { emitOpenTicket } from "@/features/tickets/openTicketEvent";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Rel { id: string; formatted_id: string; title: string; status_id: string | null; parent_ticket_id: string | null }

/** Parent and child tickets in one collapsible card. */
export function RelatedTickets({
  ticket,
  projectId,
  statuses,
  isPMBARole,
  canHaveParent,
  onChange,
}: {
  ticket: TicketRow;
  projectId: string;
  statuses: Status[];
  isPMBARole: boolean;
  canHaveParent: boolean;
  onChange: () => void;
}) {
  const [rows, setRows] = useState<Rel[]>([]);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = usePersistentState("ticket-related-open", true, { storage: "local" });

  useEffect(() => {
    let alive = true;
    const filter = ticket.parent_ticket_id
      ? `parent_ticket_id.eq.${ticket.id},id.eq.${ticket.parent_ticket_id}`
      : `parent_ticket_id.eq.${ticket.id}`;
    supabase
      .from("tickets")
      .select("id, formatted_id, title, status_id, parent_ticket_id")
      .or(filter)
      .order("ticket_number")
      .then(({ data }) => alive && setRows((data ?? []) as Rel[]));
    return () => { alive = false; };
  }, [ticket.id, ticket.parent_ticket_id, reload]);

  const parent = rows.find((r) => r.id === ticket.parent_ticket_id);
  const children = rows.filter((r) => r.parent_ticket_id === ticket.id);
  const count = (parent ? 1 : 0) + children.length;
  if (count === 0 && !(isPMBARole && (canHaveParent || childTypesFor(ticket.ticket_type).length > 0))) return null;

  const pill = (statusId: string | null) => {
    const s = statuses.find((x) => x.id === statusId);
    if (!s) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 hairline text-[10px] shrink-0">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} /> {s.name}
      </span>
    );
  };

  const row = (r: Rel) => (
    <button
      key={r.id}
      type="button"
      onClick={() => emitOpenTicket(r.id)}
      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left text-sm hover:bg-surface-2 transition"
    >
      <span className="font-mono text-xs text-dimmer shrink-0">{r.formatted_id}</span>
      <span className="flex-1 truncate">{r.title}</span>
      {pill(r.status_id)}
    </button>
  );

  const setParent = async (id: string | null) => {
    const { error } = await supabase.from("tickets").update({ parent_ticket_id: id }).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const setChild = async (childId: string, parentId: string | null) => {
    const { error } = await supabase.from("tickets").update({ parent_ticket_id: parentId }).eq("id", childId);
    if (error) return toast.error(error.message);
    setReload((n) => n + 1);
    onChange();
  };

  const childTypes = childTypesFor(ticket.ticket_type);
  const canAddChild = isPMBARole && childTypes.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl hairline bg-surface-2/40 p-4">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-semibold">
        <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        Related tickets ({count})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {canHaveParent && (
          <div className="flex gap-3">
            <div className="w-16 pt-2 text-xs font-medium text-dim">Parent</div>
            <div className="flex-1 min-w-0 space-y-1">
              {isPMBARole && (
                <ParentTicketSelect
                  projectId={projectId}
                  value={ticket.parent_ticket_id}
                  excludeId={ticket.id}
                  excludeIds={children.map((c) => c.id)}
                  types={parentTypesFor(ticket.ticket_type)}
                  size="sm"
                  onChange={setParent}
                />
              )}
              {parent ? row(parent) : !isPMBARole && <div className="pt-2 text-xs text-dimmer">None</div>}
            </div>
          </div>
        )}
        {(children.length > 0 || canAddChild) && (
          <div className="flex gap-3">
            <div className="w-16 pt-2 text-xs font-medium text-dim">Children</div>
            <div className="flex-1 min-w-0 space-y-0.5">
              {children.map((c) => (
                <div key={c.id} className="flex items-center gap-1">
                  <div className="flex-1 min-w-0">{row(c)}</div>
                  {isPMBARole && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={`Unlink ${c.formatted_id}`}
                      onClick={() => setChild(c.id, null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {canAddChild && (
                <div className="pt-1">
                  <ParentTicketSelect
                    key={`add-${children.length}`}
                    projectId={projectId}
                    value={null}
                    excludeId={ticket.id}
                    excludeIds={[...children.map((c) => c.id), ...(ticket.parent_ticket_id ? [ticket.parent_ticket_id] : [])]}
                    types={childTypes}
                    size="sm"
                    clearable={false}
                    placeholder="Add child ticket…"
                    onChange={(id) => id && setChild(id, ticket.id)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
