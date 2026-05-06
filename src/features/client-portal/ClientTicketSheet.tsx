import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ClientTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    formatted_id: string;
    title: string;
    acceptance_criteria: string | null;
  } | null;
}

export function ClientTicketSheet({ open, onOpenChange, ticket }: ClientTicketSheetProps) {
  if (!ticket) return null;
  const ac = (ticket.acceptance_criteria ?? "").trim();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 hairline text-dim">
              {ticket.formatted_id}
            </span>
          </div>
          <SheetTitle className="text-left text-xl">{ticket.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          <div className="text-xs uppercase tracking-wider text-dimmer">
            Acceptance criteria
          </div>
          {ac ? (
            <div className="prose prose-invert prose-sm max-w-none rounded-xl bg-white/[0.02] hairline p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{ac}</ReactMarkdown>
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.02] hairline p-4 text-sm text-dimmer">
              No acceptance criteria yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
