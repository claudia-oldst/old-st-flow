import type { DisciplineStatus } from "@/lib/types";
import type { HealthColor } from "./applyFilters";

export const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];
export const TYPE_OPTS = ["Standard", "Bug", "CR", "Proj"];
export const HEALTH_OPTS: { value: HealthColor; label: string; dot: string }[] = [
  { value: "good", label: "Green — under 80%", dot: "hsl(var(--health-good))" },
  { value: "warn", label: "Orange — 80–99%", dot: "hsl(var(--health-warn))" },
  { value: "bad", label: "Red — at or over estimate", dot: "hsl(var(--health-bad))" },
];
