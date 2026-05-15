import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
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
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full hairline hover:bg-white/5 transition text-dim hover:text-foreground"
              aria-label="Logging off summary"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Logging off summary</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {open && <LogoffSummaryDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
