import { useRef, useState } from "react";
import { Copy, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientEmail } from "./useClientEmail";
import { buildEmail, monthLabel } from "./buildEmail";

/** Opens an AI-drafted monthly email for the snapshot month. */
export function ClientEmailButton({ projectId, asOf, portalUrl, disabled }: {
  projectId: string; asOf: Date; portalUrl: string | null; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { loading, error, data, generate } = useClientEmail();
  const box = useRef<HTMLDivElement>(null);
  const email = data ? buildEmail({ ...data, asOf, portalUrl }) : null;

  function start() {
    setOpen(true);
    generate(projectId, asOf);
  }

  async function copy() {
    const el = box.current;
    if (!el) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([el.innerHTML], { type: "text/html" }),
        "text/plain": new Blob([el.innerText], { type: "text/plain" }),
      })]);
    } catch {
      await navigator.clipboard.writeText(el.innerText);
    }
    toast.success("Email copied");
  }

  return (
    <>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={start}
        className="h-6 px-2 gap-1.5 text-[10px] uppercase tracking-wider text-dimmer hover:text-foreground">
        <Mail className="h-3 w-3" />
        Draft client email
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client email · {monthLabel(asOf)}</DialogTitle>
          </DialogHeader>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-dim py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting email…
            </div>
          )}
          {!loading && error && <div className="text-sm text-destructive">{error}</div>}
          {!loading && email && (
            <div
              key={email.html}
              ref={box}
              contentEditable
              suppressContentEditableWarning
              className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline focus:outline-none"
              dangerouslySetInnerHTML={{ __html: email.html }}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={loading} onClick={() => generate(projectId, asOf)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
            <Button size="sm" disabled={loading || !email} onClick={copy} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
