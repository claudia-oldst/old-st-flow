import { useEffect, useMemo, useState } from "react";
import { useSprints } from "@/features/sprints/useSprintBoard";
import type { Sprint } from "@/features/sprints/types";

/** "" = nothing picked yet, "none" = explicit "No sprint", otherwise a sprint id. */
export type SprintChoice = "" | "none" | string;

function defaultSprintId(sprints: Sprint[]): SprintChoice {
  if (!sprints.length) return "";
  const today = new Date().toISOString().slice(0, 10);
  const current = sprints.find((s) => s.start_date <= today && s.end_date >= today);
  if (current) return current.id;
  const upcoming = [...sprints]
    .filter((s) => s.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  return upcoming?.id ?? "";
}

/**
 * Sprint selection state for the assign dialogs. Defaults to the sprint
 * covering today, else the next upcoming one. Nothing is picked when the
 * project has no sprints, which keeps the people lists hidden until the user
 * chooses "No sprint" or creates one.
 */
export function useSprintChoice(projectId: string, open: boolean, skip = false) {
  const { data: sprints = [] } = useSprints(open && !skip ? projectId : undefined);
  const [choice, setChoice] = useState<SprintChoice>("");

  useEffect(() => {
    if (!open || skip) return;
    setChoice((prev) => (prev ? prev : defaultSprintId(sprints)));
  }, [open, skip, sprints]);

  useEffect(() => {
    if (!open) setChoice("");
  }, [open]);

  const sprintId = !skip && choice && choice !== "none" ? choice : null;
  return useMemo(
    () => ({
      sprints: skip ? [] : sprints,
      choice: skip ? ("none" as SprintChoice) : choice,
      setChoice,
      sprintId,
      chosen: skip || choice !== "",
    }),
    [sprints, choice, sprintId, skip],
  );
}

