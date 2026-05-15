import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoggedProject {
  project_id: string;
  name: string;
  tickets: Array<{
    formatted_id: string;
    title: string;
    hours: number;
    notes: string[];
  }>;
}

export function useDailyLoggedWork(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["daily-logged-work", userId, todayKey()],
    enabled: !!userId && enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<LoggedProject[]> => {
      const { start, end } = todayRange();
      const { data, error } = await supabase
        .from("time_logs")
        .select(
          "hours, note, ticket:tickets(id, formatted_id, title, project_id, project:projects(name))",
        )
        .eq("user_id", userId!)
        .gte("logged_at", start)
        .lt("logged_at", end);

      if (error) throw error;

      const byProject = new Map<string, LoggedProject>();
      const byTicket = new Map<string, { project_id: string; formatted_id: string; title: string; hours: number; notes: string[] }>();

      for (const row of (data as any[]) ?? []) {
        const t = row.ticket;
        if (!t) continue;
        const projectId = t.project_id as string;
        const projectName = t.project?.name ?? "Unknown project";
        if (!byProject.has(projectId)) {
          byProject.set(projectId, { project_id: projectId, name: projectName, tickets: [] });
        }
        const tk = byTicket.get(t.id) ?? {
          project_id: projectId,
          formatted_id: t.formatted_id,
          title: t.title,
          hours: 0,
          notes: [],
        };
        tk.hours += Number(row.hours) || 0;
        if (row.note && typeof row.note === "string" && row.note.trim()) {
          tk.notes.push(row.note.trim());
        }
        byTicket.set(t.id, tk);
      }

      for (const tk of byTicket.values()) {
        const proj = byProject.get(tk.project_id)!;
        proj.tickets.push({
          formatted_id: tk.formatted_id,
          title: tk.title,
          hours: Math.round(tk.hours * 100) / 100,
          notes: tk.notes,
        });
      }

      return Array.from(byProject.values()).filter((p) => p.tickets.length > 0);
    },
  });
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
