import { useCallback, useRef, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SprintLite } from "./cellRules";

/** Asks once per session before the first change to each closed sprint. */
export function useClosedSprintConfirm() {
  const confirmed = useRef(new Set<string>());
  const [pending, setPending] = useState<{ sprint: SprintLite; resolve: (ok: boolean) => void } | null>(null);

  const ask = useCallback((sprint: SprintLite): Promise<boolean> => {
    if (confirmed.current.has(sprint.id)) return Promise.resolve(true);
    return new Promise((resolve) => setPending({ sprint, resolve }));
  }, []);

  const close = (ok: boolean) => {
    if (!pending) return;
    if (ok) confirmed.current.add(pending.sprint.id);
    pending.resolve(ok);
    setPending(null);
  };

  const n = pending?.sprint.sprint_number;
  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sprint {n} is closed</AlertDialogTitle>
          <AlertDialogDescription>Changing it rewrites what was committed in Sprint {n}.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>Edit Sprint {n}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { ask, dialog };
}
