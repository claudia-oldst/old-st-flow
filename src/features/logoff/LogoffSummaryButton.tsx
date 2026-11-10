import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/store/currentUser";
import { LogoffSummaryDialog } from "./LogoffSummaryDialog";

export function LogoffSummaryButton() {
  const user = useCurrentUser((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-accent-foreground"
              aria-label="Generate logoff message"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              Generate Logoff Message
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Generate logoff message</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {open && <LogoffSummaryDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
